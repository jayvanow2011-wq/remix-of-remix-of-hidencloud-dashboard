import { api } from "./api.js";
export function renderLogin(root, onSuccess) {
    root.innerHTML = `
    <div class="login-wrap">
      <form class="login-card" id="login-form">
        <div class="brand"><span class="dot"></span> HidenCloud</div>
        <p class="sub">Sign in to your control panel.</p>
        <label for="username">Username</label>
        <input id="username" name="username" autocomplete="username" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <p class="error" id="login-error"></p>
        <button class="primary" type="submit">Sign in</button>
      </form>
    </div>
  `;
    const form = root.querySelector("#login-form");
    const errorEl = root.querySelector("#login-error");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorEl.textContent = "";
        const username = root.querySelector("#username").value;
        const password = root.querySelector("#password").value;
        try {
            await api.login(username, password);
            onSuccess();
        }
        catch (err) {
            errorEl.textContent = err instanceof Error ? err.message : "Login failed";
        }
    });
}
