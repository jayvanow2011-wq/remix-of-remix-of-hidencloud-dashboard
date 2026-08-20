export function renderAdminControl(detail) {
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

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="card"><div class="label">Client ID</div><div class="value" style="font-size:16px">${c.id}</div></div>
      <div class="card"><div class="label">User</div><div class="value" style="font-size:16px">${c.user}</div></div>
      <div class="card"><div class="label">OS</div><div class="value" style="font-size:16px">${c.os}</div></div>
      <div class="card"><div class="label">IP</div><div class="value" style="font-size:16px">${c.ip}</div></div>
      <div class="card"><div class="label">CPU</div><div class="value" style="font-size:16px">${c.cpu}</div></div>
      <div class="card"><div class="label">RAM</div><div class="value" style="font-size:16px">${c.ram}</div></div>
      <div class="card"><div class="label">Uptime</div><div class="value" style="font-size:16px">${c.uptime}</div></div>
      <div class="card"><div class="label">Country</div><div class="value" style="font-size:16px">${c.country}</div></div>
    </div>

    <div class="ac-tabs" role="tablist">
      <button class="ac-tab active" data-panel="screen">Remote Screen</button>
      <button class="ac-tab" data-panel="camera">Camera View</button>
      <button class="ac-tab" data-panel="files">File Manager</button>
      <button class="ac-tab" data-panel="shell">Remote Shell</button>
    </div>

    <div id="ac-panel"></div>
  `;
}
export function bindAdminControl(root, detail, onBack) {
    root.querySelector("#ac-back").addEventListener("click", onBack);
    const panelEl = root.querySelector("#ac-panel");
    const tabs = root.querySelectorAll(".ac-tab");
    let current = "screen";
    const setPanel = (p) => {
        current = p;
        tabs.forEach((t) => t.classList.toggle("active", t.dataset["panel"] === p));
        panelEl.innerHTML = renderPanel(p, detail);
        if (p === "shell")
            bindShell(panelEl);
        if (p === "screen")
            tickScreen(panelEl);
    };
    tabs.forEach((t) => t.addEventListener("click", () => setPanel(t.dataset["panel"])));
    setPanel("screen");
}
function renderPanel(p, detail) {
    if (p === "screen") {
        return `
      <div class="card viewer">
        <div class="viewer-toolbar">
          <button class="logout" id="refresh-screen">Refresh</button>
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
                <p>report.docx</p>
                <p>budget.xlsx</p>
                <p>passwords.txt</p>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }
    if (p === "camera") {
        return `
      <div class="card viewer">
        <div class="viewer-toolbar">
          <button class="logout">● Record</button>
          <button class="logout">Snapshot</button>
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
            .map((f) => `
          <tr>
            <td>${f.type === "folder" ? "📁" : "📄"} ${f.name}</td>
            <td>${f.type}</td>
            <td>${f.size}</td>
            <td style="text-align:right">
              <button class="logout">Download</button>
              <button class="logout">Delete</button>
            </td>
          </tr>`)
            .join("");
        return `
      <div class="card">
        <div class="viewer-toolbar">
          <span class="muted">Path: C:\\Users\\${detail.client.user}</span>
          <button class="logout">Upload</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }
    return `
    <div class="card">
      <div class="shell-out" id="shell-out">HidenCloud remote shell — ${detail.client.name}\nType a command and press enter.\n</div>
      <form id="shell-form" class="shell-form">
        <span class="prompt">C:\\&gt;</span>
        <input id="shell-in" autocomplete="off" spellcheck="false" />
      </form>
    </div>`;
}
function tickScreen(root) {
    const clock = root.querySelector("#screen-clock");
    const ts = root.querySelector("#screen-ts");
    const update = () => {
        const now = new Date();
        if (clock)
            clock.textContent = now.toLocaleTimeString();
        if (ts)
            ts.textContent = `Last frame: ${now.toLocaleTimeString()}`;
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
function bindShell(root) {
    const out = root.querySelector("#shell-out");
    const form = root.querySelector("#shell-form");
    const input = root.querySelector("#shell-in");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const cmd = input.value.trim();
        if (!cmd)
            return;
        out.textContent += `\nC:\\> ${cmd}\n${fakeShell(cmd)}\n`;
        out.scrollTop = out.scrollHeight;
        input.value = "";
    });
}
function fakeShell(cmd) {
    const c = cmd.toLowerCase();
    if (c === "dir" || c === "ls")
        return "Desktop  Documents  Downloads  passwords.txt";
    if (c === "whoami")
        return "desktop-jay\\jay";
    if (c.startsWith("echo "))
        return cmd.slice(5);
    if (c === "help")
        return "Commands: dir, whoami, echo <msg>, cls, help";
    if (c === "cls")
        return "";
    return `'${cmd}' is not recognized as an internal or external command.`;
}
