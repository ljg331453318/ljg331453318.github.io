const allowedOrigins = new Set([
  "https://ljg331453318.github.io",
  "http://localhost:4173",
]);

function json(data, status = 200, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  if (allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!allowedOrigins.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    if (!allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403);
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, origin);
    if (url.pathname === "/health") return json({ ok: true }, 200, origin);
    if (url.pathname !== "/api/views") return json({ error: "Not found" }, 404, origin);

    try {
      const row = await env.DB.prepare(
        "UPDATE page_views SET view_count = view_count + 1 WHERE id = 'homepage' RETURNING view_count AS views",
      ).first();
      if (!row) throw new Error("Counter row is not initialized");
      return json({ views: row.views }, 200, origin);
    } catch {
      return json({ error: "Counter temporarily unavailable" }, 503, origin);
    }
  },
};
