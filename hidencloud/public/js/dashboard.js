export function renderDashboard(data) {
    const a = data.analytics;
    const total = Math.max(a.total, 1);
    const onlinePct = Math.round((a.online / total) * 100);
    const offlinePct = 100 - onlinePct;
    const cards = [
        { label: "Total clients", value: a.total, delta: `+${a.newToday} today`, tone: "" },
        { label: "Online", value: a.online, delta: `${onlinePct}% of fleet`, tone: "ok" },
        { label: "Offline", value: a.offline, delta: `${offlinePct}% of fleet`, tone: "warn" },
        { label: "Countries", value: a.countries, delta: "worldwide", tone: "" },
        { label: "Commands sent", value: a.commandsSent, delta: "last 24h", tone: "" },
        { label: "Screens captured", value: a.screensCaptured, delta: "last 24h", tone: "" },
    ]
        .map((c) => `
        <div class="card">
          <div class="label">${c.label}</div>
          <div class="value">${c.value}</div>
          <div class="delta ${c.tone}">${c.delta}</div>
        </div>`)
        .join("");
    const activity = [
        `Client ${data.clients[0]?.id ?? ""} came online`,
        "Screenshot captured from DESKTOP-JAY",
        "File listing requested: C:\\Users\\jay",
        "Panel login from 127.0.0.1",
    ]
        .map((a) => `<div class="summary-row"><span>${a}</span><span>just now</span></div>`)
        .join("");
    return `
    <h1>Dashboard</h1>
    <p class="page-sub">Live analytics across all connected clients.</p>
    <div class="grid">${cards}</div>

    <h2>Fleet status</h2>
    <div class="card">
      <div class="bar">
        <div class="bar-online" style="width:${onlinePct}%"></div>
        <div class="bar-offline" style="width:${offlinePct}%"></div>
      </div>
      <div class="legend">
        <span><i class="dot-online"></i> Online ${a.online}</span>
        <span><i class="dot-offline"></i> Offline ${a.offline}</span>
      </div>
    </div>

    <h2>Recent activity</h2>
    <div class="card">${activity}</div>
  `;
}
