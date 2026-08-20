import { api } from "./api.js";
import { renderLogin } from "./login.js";
import { renderDashboard } from "./dashboard.js";
import { renderClients } from "./clients.js";
import { renderBuilder, bindBuilder } from "./builder.js";
const root = document.getElementById("app");
const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "clients", label: "Clients" },
    { id: "builder", label: "Builder" },
];
let currentTab = "dashboard";
let data = null;
async function showPanel() {
    data = await api.stats();
    root.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand" style="margin-bottom:16px"><span class="dot"></span> HidenCloud</div>
        ${TABS.map((t) => `<button class="nav-btn" data-tab="${t.id}">${t.label}</button>`).join("")}
        <div class="spacer"></div>
        <button class="logout" id="logout">Sign out</button>
      </aside>
      <main class="main" id="view"></main>
    </div>
  `;
    root.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            currentTab = btn.dataset["tab"];
            renderTab();
        });
    });
    root.querySelector("#logout").addEventListener("click", async () => {
        await api.logout();
        boot();
    });
    renderTab();
}
function renderTab() {
    const view = root.querySelector("#view");
    root.querySelectorAll(".nav-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset["tab"] === currentTab);
    });
    if (currentTab === "dashboard")
        view.innerHTML = renderDashboard(data);
    else if (currentTab === "clients")
        view.innerHTML = renderClients(data);
    else {
        view.innerHTML = renderBuilder();
        bindBuilder(view);
    }
}
async function boot() {
    if (await api.me()) {
        await showPanel();
    }
    else {
        renderLogin(root, () => void showPanel());
    }
}
void boot();
