export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  defaultRateToUSD: number; // 1 USD = X Currency
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", defaultRateToUSD: 1.0 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", defaultRateToUSD: 58.20 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", defaultRateToUSD: 1.54 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", defaultRateToUSD: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", defaultRateToUSD: 0.79 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", defaultRateToUSD: 1.39 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", defaultRateToUSD: 1.34 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", defaultRateToUSD: 152.5 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", defaultRateToUSD: 3.67 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", defaultRateToUSD: 84.4 },
];

export function getCurrencyInfo(codeOrSymbol?: string): CurrencyOption {
  if (!codeOrSymbol) return SUPPORTED_CURRENCIES[0];
  const clean = codeOrSymbol.toUpperCase().trim();
  const byCode = SUPPORTED_CURRENCIES.find((c) => c.code === clean);
  if (byCode) return byCode;
  const bySymbol = SUPPORTED_CURRENCIES.find((c) => c.symbol === codeOrSymbol);
  if (bySymbol) return bySymbol;
  return SUPPORTED_CURRENCIES[0];
}

export function getDefaultExchangeRate(fromCodeOrSymbol?: string, toCode?: string): number {
  const fromInfo = getCurrencyInfo(fromCodeOrSymbol);
  const toInfo = getCurrencyInfo(toCode || "USD");
  if (fromInfo.code === toInfo.code) return 1.0;
  const rateToUSD = 1 / fromInfo.defaultRateToUSD;
  const targetRate = rateToUSD * toInfo.defaultRateToUSD;
  return Math.round(targetRate * 10000) / 10000;
}

export function formatCurrencyAmount(amount: number, currencyCodeOrSymbol?: string): string {
  const info = getCurrencyInfo(currencyCodeOrSymbol);
  return `${info.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// In-memory cache for live exchange rates
interface CachedRate {
  rate: number;
  timestamp: number;
  timeLastUpdateUtc?: string;
}

const rateCache = new Map<string, CachedRate>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch real-time exchange rate between two currencies via open live market API.
 * Falls back safely to internal market benchmark rates if offline or rate limit occurs.
 */
export async function fetchRealtimeExchangeRate(
  fromCodeOrSymbol?: string,
  toCode?: string
): Promise<{ rate: number; isLive: boolean; lastUpdated?: string }> {
  const fromInfo = getCurrencyInfo(fromCodeOrSymbol);
  const toInfo = getCurrencyInfo(toCode || "USD");

  if (fromInfo.code === toInfo.code) {
    return { rate: 1.0, isLive: true };
  }

  const cacheKey = `${fromInfo.code}_${toInfo.code}`;
  const cached = rateCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      rate: cached.rate,
      isLive: true,
      lastUpdated: cached.timeLastUpdateUtc || "Cached live rate",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`https://open.er-api.com/v6/latest/${fromInfo.code}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.result === "success" && data.rates && data.rates[toInfo.code]) {
        const liveRate = Math.round(Number(data.rates[toInfo.code]) * 10000) / 10000;
        const timeUtc = data.time_last_update_utc || new Date().toUTCString();

        rateCache.set(cacheKey, {
          rate: liveRate,
          timestamp: now,
          timeLastUpdateUtc: timeUtc,
        });

        return {
          rate: liveRate,
          isLive: true,
          lastUpdated: timeUtc,
        };
      }
    }
  } catch (err) {
    // Graceful fallback to default benchmark
  }

  return {
    rate: getDefaultExchangeRate(fromInfo.code, toInfo.code),
    isLive: false,
    lastUpdated: "Benchmark fallback rate",
  };
}
