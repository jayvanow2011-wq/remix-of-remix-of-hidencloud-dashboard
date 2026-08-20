import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HidenCloud Panel — Node.js Control Panel Source" },
      {
        name: "description",
        content:
          "HidenCloud is a dark-themed TypeScript control panel with dashboard, clients and builder tabs, served by a plain Node.js Express server.",
      },
      { property: "og:title", content: "HidenCloud Panel — Node.js Control Panel Source" },
      {
        property: "og:description",
        content:
          "Dark TypeScript control panel with dashboard, clients and builder tabs, ready to host on any Node.js server.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">HidenCloud Panel</h1>
        <p className="text-muted-foreground">
          The full site lives in the <code>hidencloud/</code> folder: a dark-themed TypeScript
          frontend in <code>src/app</code> served by <code>server.js</code> (Express) with login and
          a dashboard containing Dashboard, Clients and Builder tabs.
        </p>
        <pre className="rounded-lg border border-border bg-card p-4 text-sm">
          {`cd hidencloud\nnpm install\nnpm start   # http://localhost:3000`}
        </pre>
        <p className="text-sm text-muted-foreground">
          Login: <strong>jayjay</strong> / <strong>jayjay100!</strong> (override with PANEL_USER and
          PANEL_PASS).
        </p>
      </main>
    </div>
  );
}
