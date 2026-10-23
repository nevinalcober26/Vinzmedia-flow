export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  defaultRateToUSD: number; // 1 USD = X Currency
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", defaultRateToUSD: 1.0 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", defaultRateToUSD: 57.50 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", defaultRateToUSD: 1.52 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", defaultRateToUSD: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", defaultRateToUSD: 0.78 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", defaultRateToUSD: 1.38 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", defaultRateToUSD: 1.34 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", defaultRateToUSD: 152.0 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", defaultRateToUSD: 3.67 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", defaultRateToUSD: 84.0 },
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
