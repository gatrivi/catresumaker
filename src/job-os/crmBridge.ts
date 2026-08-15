const FALLBACK_CRM_URL = "https://gatrivi-git-agent-catresumaker-job-bridge-gatrivis-projects.vercel.app";
const CRM_URL_KEY = "catresumaker_crm_url";

function crmBaseUrl(): string {
  const envUrl = String(import.meta.env.VITE_CRM_URL ?? "").trim();
  const saved = localStorage.getItem(CRM_URL_KEY)?.trim();
  return (envUrl || saved || FALLBACK_CRM_URL).replace(/\/$/, "");
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function patchedStatus(init?: RequestInit): string | null {
  if (typeof init?.body !== "string") return null;
  try {
    const body = JSON.parse(init.body);
    return typeof body?.status === "string" && body.status.trim() ? body.status.trim() : null;
  } catch {
    return null;
  }
}

function syncWindow(): Window | null {
  const popup = window.open("about:blank", "gatrivi-crm-sync", "popup,width=440,height=190");
  if (popup) {
    popup.document.title = "GATRIVI CRM";
    popup.document.body.style.font = "14px system-ui";
    popup.document.body.style.padding = "24px";
    popup.document.body.textContent = "Sincronizando con GATRIVI CRM…";
  }
  return popup;
}

function bridgeUrl(record: any, status: string): string {
  const url = new URL("/bridge/catresumaker", crmBaseUrl());
  url.searchParams.set("id", String(record?.id ?? record?.slug ?? ""));
  url.searchParams.set("company", String(record?.company ?? "Empresa sin nombre"));
  url.searchParams.set("title", String(record?.title ?? "Aplicación sin título"));
  if (record?.url) url.searchParams.set("url", String(record.url));
  url.searchParams.set("status", status);
  url.searchParams.set("close", "1");
  return url.toString();
}

export function installCrmBridge() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const match = url.match(/\/api\/job-os\/queue\/([^/?#]+)/);
    const status = match && requestMethod(input, init) === "PATCH" ? patchedStatus(init) : null;
    const popup = status ? syncWindow() : null;

    try {
      const response = await nativeFetch(input, init);
      if (!status || !match) return response;
      if (!response.ok) {
        popup?.close();
        return response;
      }

      try {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        const detail = await nativeFetch(`/api/job-os/job/${encodeURIComponent(match[1])}`, { headers });
        if (!detail.ok) throw new Error(`detail ${detail.status}`);
        const payload = await detail.json();
        const record = payload?.record;
        if (!record) throw new Error("record missing");
        const target = bridgeUrl(record, status);
        if (popup) popup.location.replace(target);
        else console.warn("[CRM bridge] popup blocked; application was not mirrored", target);
      } catch (error) {
        popup?.close();
        console.warn("[CRM bridge] sync failed; Catresumaker status change is still saved", error);
      }
      return response;
    } catch (error) {
      popup?.close();
      throw error;
    }
  };
}

export function setCrmBridgeUrl(url: string) {
  const normalized = url.trim().replace(/\/$/, "");
  if (normalized) localStorage.setItem(CRM_URL_KEY, normalized);
  else localStorage.removeItem(CRM_URL_KEY);
}
