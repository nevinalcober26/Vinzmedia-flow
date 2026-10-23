export interface InvoiceSenderSettings {
  company: string;
  address: string;
  email: string;
  taxId: string;
}

const storageKey = (workspaceId: string) => `vinzflow_invoice_sender_${workspaceId}`;

export function getInvoiceSenderSettings(workspaceId: string, workspaceName: string): InvoiceSenderSettings {
  const defaults = {
    company: workspaceName,
    address: "Suite 2400, Horizon Executive Tower",
    email: "billing@vinzmedia.com",
    taxId: "US-EIN-94-2849102",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(workspaceId)) || "null");
    return saved && typeof saved === "object" ? { ...defaults, ...saved } : defaults;
  } catch {
    return defaults;
  }
}

export function saveInvoiceSenderSettings(workspaceId: string, sender: InvoiceSenderSettings) {
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(sender));
}
