export function renderClients(data) {
    const rows = data.clients
        .map((c) => `
        <tr>
          <td><code>${c.id}</code></td>
          <td>${c.name}</td>
          <td>${c.user}</td>
          <td>${c.os}</td>
          <td>${c.ip}</td>
          <td><span class="badge ${c.status}"><i class="pulse"></i>${c.status}</span></td>
          <td><button class="primary connect-btn" data-id="${c.id}" ${c.status !== "online" ? "disabled" : ""}>Connect</button></td>
        </tr>`)
        .join("");
    return `
    <h1>Clients</h1>
    <p class="page-sub">${data.clients.length} client${data.clients.length === 1 ? "" : "s"} registered. Click Connect to open Admin Control.</p>
    <div class="card">
      <table>
        <thead>
          <tr><th>ID</th><th>Hostname</th><th>User</th><th>OS</th><th>IP</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
