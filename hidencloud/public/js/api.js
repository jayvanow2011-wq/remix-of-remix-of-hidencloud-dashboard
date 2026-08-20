async function post(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json());
    if (!res.ok)
        throw new Error(data.error || "Request failed");
    return data;
}
export const api = {
    async me() {
        const res = await fetch("/api/me");
        return res.ok;
    },
    login(username, password) {
        return post("/api/login", { username, password });
    },
    logout() {
        return post("/api/logout");
    },
    async stats() {
        const res = await fetch("/api/stats");
        if (!res.ok)
            throw new Error("Not authorized");
        return (await res.json());
    },
    async client(id) {
        const res = await fetch(`/api/client/${encodeURIComponent(id)}`);
        if (!res.ok)
            throw new Error("Client not found");
        return (await res.json());
    },
};
