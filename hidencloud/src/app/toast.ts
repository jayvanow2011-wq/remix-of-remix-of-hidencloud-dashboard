export type ToastKind = "info" | "success" | "warn" | "error";

export function toast(msg: string, kind: ToastKind = "info"): void {
  const existing = document.querySelectorAll(".toast");
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  el.style.bottom = `${20 + existing.length * 56}px`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
