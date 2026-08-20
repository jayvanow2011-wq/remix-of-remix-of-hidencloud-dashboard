interface BuilderState {
  location: string;
  ram: number;
  cpu: number;
  disk: number;
}

const state: BuilderState = { location: "Frankfurt", ram: 8, cpu: 4, disk: 60 };

function price(s: BuilderState): number {
  return s.ram * 1.5 + s.cpu * 2 + s.disk * 0.05;
}

export function renderBuilder(): string {
  return `
    <h1>Builder</h1>
    <p class="page-sub">Configure a new server and see the price update live.</p>
    <div class="builder">
      <div class="card">
        <label for="location">Location</label>
        <select id="location">
          <option>Frankfurt</option>
          <option>Amsterdam</option>
          <option>New York</option>
          <option>Singapore</option>
        </select>

        <label for="ram">Memory: <strong id="ram-val">${state.ram} GB</strong></label>
        <input type="range" id="ram" min="2" max="64" step="2" value="${state.ram}" />

        <label for="cpu">vCPU cores: <strong id="cpu-val">${state.cpu}</strong></label>
        <input type="range" id="cpu" min="1" max="16" step="1" value="${state.cpu}" />

        <label for="disk">Disk: <strong id="disk-val">${state.disk} GB</strong></label>
        <input type="range" id="disk" min="20" max="500" step="10" value="${state.disk}" />
      </div>
      <div class="card">
        <h2 style="margin-top:0">Summary</h2>
        <div id="summary"></div>
        <div class="total" id="total"></div>
        <button class="primary" id="deploy" style="margin-top:16px">Deploy server</button>
        <p class="sub" id="deploy-msg" style="margin-bottom:0"></p>
      </div>
    </div>
  `;
}

export function bindBuilder(root: HTMLElement): void {
  const summary = root.querySelector<HTMLDivElement>("#summary")!;
  const total = root.querySelector<HTMLDivElement>("#total")!;

  function update(): void {
    summary.innerHTML = `
      <div class="summary-row"><span>Location</span><span>${state.location}</span></div>
      <div class="summary-row"><span>Memory</span><span>${state.ram} GB</span></div>
      <div class="summary-row"><span>vCPU</span><span>${state.cpu} cores</span></div>
      <div class="summary-row"><span>Disk</span><span>${state.disk} GB</span></div>
    `;
    total.textContent = `€${price(state).toFixed(2)} / month`;
  }

  const bindRange = (id: keyof BuilderState, suffix: string) => {
    const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
    const out = root.querySelector<HTMLElement>(`#${id}-val`)!;
    input.addEventListener("input", () => {
      (state[id] as number) = Number(input.value);
      out.textContent = `${input.value}${suffix}`;
      update();
    });
  };

  bindRange("ram", " GB");
  bindRange("cpu", "");
  bindRange("disk", " GB");

  const loc = root.querySelector<HTMLSelectElement>("#location")!;
  loc.value = state.location;
  loc.addEventListener("change", () => {
    state.location = loc.value;
    update();
  });

  root.querySelector<HTMLButtonElement>("#deploy")!.addEventListener("click", () => {
    root.querySelector<HTMLParagraphElement>("#deploy-msg")!.textContent =
      `Queued a ${state.ram} GB / ${state.cpu} vCPU server in ${state.location}.`;
  });

  update();
}
