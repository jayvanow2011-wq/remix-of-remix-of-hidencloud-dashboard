export interface Analytics {
  total: number;
  online: number;
  offline: number;
  idle: number;
  countries: number;
  newToday: number;
  commandsSent: number;
  screensCaptured: number;
  keylogs: number;
  bandwidth: string;
  avgUptime: string;
  threats: number;
}

export interface Client {
  id: string;
  name: string;
  user: string;
  os: string;
  ip: string;
  country: string;
  countryCode: string;
  status: "online" | "offline" | "idle";
  lastSeen: string;
  cpu: string;
  ram: string;
  gpu: string;
  uptime: string;
  group: string;
  av: string;
  netSpeed: string;
  installed: string;
}

export interface StatsResponse {
  ok: boolean;
  analytics: Analytics;
  clients: Client[];
}

export interface ClientFile {
  name: string;
  type: "folder" | "file";
  size: string;
  modified: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: string;
  mem: string;
  status: string;
}

export interface KeylogEntry {
  ts: string;
  window: string;
  text: string;
}

export interface ClipboardEntry {
  ts: string;
  content: string;
}

export interface ClientDetailResponse {
  ok: boolean;
  client: Client;
  files: ClientFile[];
  processes: ProcessInfo[];
  keylogs: KeylogEntry[];
  clipboard: ClipboardEntry[];
}

export interface LogEntry {
  id: string;
  type: "info" | "warn" | "success" | "error";
  msg: string;
  ts: number;
}

export type TabId = "dashboard" | "clients" | "builder" | "logs" | "settings";
