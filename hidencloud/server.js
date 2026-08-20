const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = process.env.PANEL_USER || "jayjay";
const PASSWORD = process.env.PANEL_PASS || "jayjay100!";

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12h absolute
const SESSION_IDLE_MS = 1000 * 60 * 30; // 30m idle timeout
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 1000 * 60 * 10; // 10m window / lockout

const sessions = new Map(); // sid -> { user, createdAt, lastSeen, csrf, ip, ua }
const loginAttempts = new Map(); // ip -> { count, firstAt, lockedUntil }

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "unknown";
}

function isAuthed(req) {
  const sid = req.cookies && req.cookies.hc_session;
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s) return null;
  const now = Date.now();
  if (now - s.createdAt > SESSION_MAX_AGE_MS || now - s.lastSeen > SESSION_IDLE_MS) {
    sessions.delete(sid);
    return null;
  }
  s.lastSeen = now;
  return { sid, session: s };
}

function requireAuth(req, res, next) {
  const auth = isAuthed(req);
  if (!auth) return res.status(401).json({ ok: false, error: "Unauthorized" });
  req.auth = auth;
  next();
}

function requireCsrf(req, res, next) {
  const header = req.headers["x-csrf-token"];
  if (!header || header !== req.auth.session.csrf) {
    return res.status(403).json({ ok: false, error: "Invalid CSRF token" });
  }
  next();
}

// --- security headers ---
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  next();
});

app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

// --- login with brute-force protection ---
app.post("/api/login", (req, res) => {
  const ip = clientIp(req);
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (entry && entry.lockedUntil && entry.lockedUntil > now) {
    const secs = Math.ceil((entry.lockedUntil - now) / 1000);
    return res.status(429).json({ ok: false, error: `Too many attempts. Try again in ${secs}s.` });
  }
  const { username = "", password = "" } = req.body || {};
  const ok = safeEqual(username, USERNAME) && safeEqual(password, PASSWORD);
  if (!ok) {
    if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
      entry = { count: 1, firstAt: now, lockedUntil: 0 };
    } else {
      entry.count += 1;
      if (entry.count >= LOGIN_MAX_ATTEMPTS) entry.lockedUntil = now + LOGIN_WINDOW_MS;
    }
    loginAttempts.set(ip, entry);
    addLog("warn", `Failed login from ${ip} (attempt ${entry.count}/${LOGIN_MAX_ATTEMPTS})`);
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
  loginAttempts.delete(ip);
  // rotate session id on login
  const sid = crypto.randomBytes(32).toString("hex");
  const csrf = crypto.randomBytes(24).toString("hex");
  sessions.set(sid, { user: USERNAME, createdAt: now, lastSeen: now, csrf, ip, ua: req.headers["user-agent"] || "" });
  res.cookie("hc_session", sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
  // csrf cookie is readable by JS on same origin so client can echo it
  res.cookie("hc_csrf", csrf, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
  addLog("success", `Login successful for ${USERNAME} from ${ip}`);
  res.json({ ok: true, user: USERNAME, csrf });
});

app.post("/api/logout", (req, res) => {
  const sid = req.cookies && req.cookies.hc_session;
  if (sid) sessions.delete(sid);
  res.clearCookie("hc_session");
  res.clearCookie("hc_csrf");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const auth = isAuthed(req);
  if (!auth) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: auth.session.user, csrf: auth.session.csrf });
});

const CLIENTS = [
  { id: "HC-9F21A", name: "DESKTOP-JAY", user: "jay", os: "Windows 11 Pro", ip: "192.168.1.42", country: "Sweden", countryCode: "SE", status: "online", lastSeen: "just now", cpu: "Intel i7-13700K", ram: "32 GB", gpu: "RTX 4070 Ti", uptime: "3h 12m", group: "Personal", av: "Windows Defender", netSpeed: "85 Mbps", installed: "2025-12-01" },
  { id: "HC-3B7E2", name: "LAPTOP-ADMIN", user: "admin", os: "Windows 10 Enterprise", ip: "10.0.0.15", country: "Germany", countryCode: "DE", status: "online", lastSeen: "2m ago", cpu: "AMD Ryzen 9 5900X", ram: "64 GB", gpu: "RX 6800 XT", uptime: "14h 42m", group: "Work", av: "Kaspersky", netSpeed: "120 Mbps", installed: "2025-11-18" },
  { id: "HC-01DC9", name: "SERVER-PROD", user: "root", os: "Ubuntu 22.04 LTS", ip: "172.16.0.5", country: "Netherlands", countryCode: "NL", status: "online", lastSeen: "just now", cpu: "Xeon E-2388G", ram: "128 GB", gpu: "None", uptime: "47d 6h", group: "Servers", av: "ClamAV", netSpeed: "1 Gbps", installed: "2025-06-22" },
  { id: "HC-88FA4", name: "WORKSTATION-DEV", user: "dev", os: "macOS Sonoma 14.4", ip: "192.168.2.88", country: "United States", countryCode: "US", status: "offline", lastSeen: "3 hours ago", cpu: "Apple M3 Max", ram: "96 GB", gpu: "M3 Max 40-core", uptime: "0", group: "Work", av: "None", netSpeed: "0", installed: "2026-01-10" },
  { id: "HC-CC291", name: "PC-GAMING", user: "player1", os: "Windows 11 Home", ip: "192.168.3.200", country: "Japan", countryCode: "JP", status: "idle", lastSeen: "28m ago", cpu: "Intel i9-14900K", ram: "64 GB", gpu: "RTX 4090", uptime: "1h 5m", group: "Personal", av: "Bitdefender", netSpeed: "200 Mbps", installed: "2026-03-02" },
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

app.get("/api/stats", requireAuth, (req, res) => {
  const online = CLIENTS.filter((c) => c.status === "online").length;
  const offline = CLIENTS.filter((c) => c.status === "offline").length;
  const idle = CLIENTS.filter((c) => c.status === "idle").length;
  const countries = [...new Set(CLIENTS.map((c) => c.country))].length;
  res.json({
    ok: true,
    analytics: { total: CLIENTS.length, online, offline, idle, countries, newToday: 2, commandsSent: 147, screensCaptured: 34, keylogs: 892, bandwidth: "2.4 GB", avgUptime: "12h 30m", threats: 3 },
    clients: CLIENTS,
  });
});

app.get("/api/logs", requireAuth, (req, res) => {
  res.json({ ok: true, logs: LOGS });
});

app.post("/api/logs", requireAuth, requireCsrf, (req, res) => {
  LOGS.length = 0;
  addLog("info", `Logs cleared by ${req.auth.session.user}`);
  res.json({ ok: true });
});

app.get("/api/client/:id", requireAuth, (req, res) => {
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
      { ts: "16:35:00", window: "VS Code", text: 'const apiKey = "sk-..."' },
    ],
    clipboard: [
      { ts: "16:41:10", content: "https://github.com/settings/tokens" },
      { ts: "16:39:30", content: "Password123!" },
      { ts: "16:38:00", content: "SELECT * FROM users WHERE admin=true" },
      { ts: "16:35:45", content: "192.168.1.1" },
    ],
  });
});

app.post("/api/command/:id", requireAuth, requireCsrf, (req, res) => {
  const client = CLIENTS.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ ok: false });
  const { action } = req.body || {};
  if (typeof action !== "string" || action.length > 64 || !/^[a-z0-9_\-]+$/i.test(action)) {
    return res.status(400).json({ ok: false, error: "Invalid action" });
  }
  addLog("info", `Command "${action}" sent to ${client.name}`);
  res.json({ ok: true, result: `Command "${action}" executed on ${client.name}` });
});

// Payload builder — generates a fake stub for the download
app.post("/api/build", requireAuth, requireCsrf, (req, res) => {
  const cfg = req.body || {};
  const host = String(cfg.host || "").slice(0, 128);
  const port = Number(cfg.port) || 4444;
  if (!/^[a-z0-9\.\-\_]+$/i.test(host)) {
    return res.status(400).json({ ok: false, error: "Invalid host" });
  }
  const filename = `hidencloud-stub-${Date.now()}.bin`;
  const marker = `HIDENCLOUD_STUB\nhost=${host}\nport=${port}\nfeatures=${JSON.stringify(cfg.features || {})}\nformat=${String(cfg.format || "exe").slice(0, 8)}\nobfuscation=${String(cfg.obfuscation || "none").slice(0, 16)}\nbuiltAt=${new Date().toISOString()}\n`;
  addLog("success", `Payload built: ${filename} → ${host}:${port}`);
  res.json({ ok: true, filename, size: marker.length, contents: marker });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`HidenCloud panel running on http://localhost:${PORT}`);
});
