// A tiny in-memory stand-in for Supabase's REST + auth endpoints, so the
// SIGNED-IN app can be exercised locally — the save queue, the sidebar
// layout, a sale end to end — without touching the real project or any
// real credential. 127.0.0.1 only; test data only; nothing here is a
// faithful Postgres (no RLS, no constraints beyond a duplicate id).
//
//   1. node scripts/mock-supabase.mjs
//   2. In a checkout with NO .env.local (a fresh worktree), create
//      .env.development.local (gitignored) with:
//        NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3999
//        NEXT_PUBLIC_SUPABASE_ANON_KEY=local-mock-anon-key
//      and start `next dev`. `next build` never reads that file.
//   3. Signed out, /app shows the sign-in screen. To be signed in, put a
//      made-up session in localStorage under `sb-127-auth-token`
//      ({access_token: "<three dot-separated base64 parts, exp in the
//      future>", refresh_token, token_type: "bearer", expires_in,
//      expires_at, user: {id: UID below, email}}) and reload.
//
// Control (never affected by "offline"):
//   POST /__mock/offline?on=1|0   drop every REST/auth request (a dead network)
//   POST /__mock/reject?n=1       answer the next n writes with 409 / 23505
//   POST /__mock/tokenlife?s=3600  lifetime of access tokens minted by the refresh endpoint
//   POST /__mock/refreshfail?n=1  answer the next n token refreshes with 503 (auth-js: retryable)
//   POST /__mock/hold?n=1&skip=0  let `skip` writes through, then keep the next n open (in flight) until…
//        (&auth=1: hold GET /auth/v1/user — the magic-link arrival's user lookup — instead of writes)
//   POST /__mock/release          …this answers them normally (a slow connection that recovered), or
//   POST /__mock/drop             …this destroys them (a connection that died mid-request)
//   GET  /__mock/state            tables + a log of every write
//   POST /__mock/reset            back to the seed
import http from "node:http";

const UID = "9b2f6d1e-3c4a-4f7b-8a1d-000000000001";
const PK = { business_profiles: "account_id", notification_prefs: "account_id", deletion_requests: "account_id" };
const seed = () => ({
  business_profiles: [{ account_id: UID, business_name: "Mock Test Co", owner_name: "", us_state: "" }],
  services: [{ id: "5e7a1c00-0000-4000-8000-000000000001", account_id: UID, name: "Tutoring", pricing_type: "rate", price_cents: 4000, rate_unit: "hour", cost_cents: null }],
  transactions: [], sales: [], clients: [], recurring_templates: [], notification_prefs: [], deletion_requests: [],
});
let tables = seed();
let offline = false;
let rejectNext = 0;
let holdNext = 0;
let holdSkip = 0;
let holdAuth = false;
let tokenLife = 3600;
let refreshFail = 0;
let refreshes = 0;
const userFromToken = (tok) => {
  try {
    const p = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString());
    if (typeof p.sub === "string") return { id: p.sub, email: p.email ?? "mock@example.invalid", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  } catch { /* not a JWT */ }
  return { id: UID, email: "mock@example.invalid" };
};
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
// A made-up JWT (nothing verifies the signature here) for UID, expiring in `tokenLife` s.
const mintSession = () => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + tokenLife;
  refreshes += 1;
  const user = { id: UID, email: "mock@example.invalid", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: { lang: "en" }, created_at: "2026-01-01T00:00:00Z" };
  const access_token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: UID, email: user.email, role: "authenticated", aud: "authenticated", exp, iat: now })}.mock`;
  return { access_token, token_type: "bearer", expires_in: tokenLife, expires_at: exp, refresh_token: `mock-refresh-${refreshes}`, user };
};
const held = new Set();
const log = [];

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS,HEAD", "access-control-expose-headers": "content-range" };
const send = (res, status, body, extra = {}) => {
  const text = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, { ...cors, "content-type": "application/json", ...extra });
  res.end(text);
};
const coerce = (v) => (v === "null" ? null : v === "true" ? true : v === "false" ? false : v);
const matches = (row, filters) => filters.every(([col, expr]) => {
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot), raw = expr.slice(dot + 1);
  const cell = row[col];
  if (op === "eq") return String(cell) === raw;
  if (op === "neq") return String(cell) !== raw;
  if (op === "is") return raw === "null" ? cell === null || cell === undefined : cell === coerce(raw);
  if (op === "in") return raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(cell));
  if (op === "gte") return String(cell) >= raw;
  if (op === "lte") return String(cell) <= raw;
  if (op === "gt") return String(cell) > raw;
  if (op === "lt") return String(cell) < raw;
  return true; // unknown operator: do not filter
});
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204);
  if (url.pathname === "/__mock/offline") { offline = url.searchParams.get("on") === "1"; return send(res, 200, { offline }); }
  if (url.pathname === "/__mock/state") return send(res, 200, { offline, refreshes, tables, log });
  if (url.pathname === "/__mock/tokenlife") { tokenLife = Number(url.searchParams.get("s") ?? 3600); return send(res, 200, { tokenLife }); }
  if (url.pathname === "/__mock/refreshfail") { refreshFail = Number(url.searchParams.get("n") ?? 1); return send(res, 200, { refreshFail }); }
  if (url.pathname === "/__mock/reset") { tables = seed(); log.length = 0; offline = false; return send(res, 200, { ok: true }); }
  if (url.pathname === "/__mock/hold") { holdNext = Number(url.searchParams.get("n") ?? 1); holdSkip = Number(url.searchParams.get("skip") ?? 0); holdAuth = url.searchParams.get("auth") === "1"; return send(res, 200, { holdNext, holdSkip, holdAuth }); }
  if (url.pathname === "/__mock/release") { const n = held.size; for (const h of held) h.resume(); held.clear(); log.push(`RELEASED ${n} HELD`); return send(res, 200, { released: n }); }
  if (url.pathname === "/__mock/drop") { const n = held.size; for (const h of held) { h.req.socket.destroy(); h.resume(); } held.clear(); log.push(`DROPPED ${n} HELD`); return send(res, 200, { dropped: n }); }
  if (url.pathname === "/__mock/reject") { rejectNext = Number(url.searchParams.get("n") ?? 1); return send(res, 200, { rejectNext }); }
  if (offline) { log.push(`DROPPED ${req.method} ${url.pathname}`); req.socket.destroy(); return; }
  const holdable = holdAuth
    ? url.pathname === "/auth/v1/user"
    : req.method !== "GET" && url.pathname.startsWith("/rest/v1/");
  if (holdNext > 0 && holdable) {
    if (holdSkip > 0) holdSkip -= 1;
    else {
      holdNext -= 1; log.push(`HELD ${req.method} ${url.pathname}`);
      await new Promise((resume) => held.add({ req, resume }));
      if (req.socket.destroyed) return;
      log.push(`RELEASED ${req.method} ${url.pathname}`);
    }
  }
  if (rejectNext > 0 && req.method !== "GET" && url.pathname.startsWith("/rest/v1/")) {
    rejectNext -= 1; log.push(`REJECTED ${req.method} ${url.pathname}`);
    return send(res, 409, { code: "23505", message: 'duplicate key value violates unique constraint "mock_reject"', details: null, hint: null });
  }

  let body = "";
  for await (const chunk of req) body += chunk;
  const json = body ? JSON.parse(body) : undefined;

  if (url.pathname.startsWith("/auth/v1/")) {
    log.push(`AUTH ${req.method} ${url.pathname.slice(8)}`);
    if (url.pathname.endsWith("/settings")) return send(res, 200, { external: { google: false } });
    // The user the bearer token names (its unverified payload), so a link for
    // ANOTHER account can be played against a tab signed in as UID.
    if (url.pathname.endsWith("/user")) return send(res, 200, userFromToken((req.headers.authorization ?? "").replace(/^Bearer /, "")));
    if (url.pathname.endsWith("/logout")) return send(res, 204);
    if (url.pathname.endsWith("/token") && url.searchParams.get("grant_type") === "refresh_token") {
      if (refreshFail > 0) { refreshFail -= 1; log.push("REFRESH 503"); return send(res, 503, { code: 503, msg: "mock refresh failure" }); }
      log.push(`REFRESH ok (${json?.refresh_token})`);
      return send(res, 200, mintSession());
    }
    return send(res, 400, { error: "unsupported in the mock" });
  }
  if (url.pathname.startsWith("/rest/v1/rpc/")) { log.push(`RPC ${url.pathname.slice(13)}`); return send(res, 200, null); }
  if (!url.pathname.startsWith("/rest/v1/")) return send(res, 404, { message: "not found" });

  const table = url.pathname.slice("/rest/v1/".length);
  const rows = (tables[table] ??= []);
  const pk = PK[table] ?? "id";
  const filters = [...url.searchParams].filter(([k]) => !RESERVED.has(k));
  const prefer = req.headers.prefer ?? "";
  const wantsObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const reply = (status, out) => {
    if (!prefer.includes("return=representation") && req.method !== "GET") return send(res, status === 200 ? 204 : status);
    if (wantsObject) return out.length === 1 ? send(res, status, out[0]) : send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `Results contain ${out.length} rows` });
    return send(res, status, out);
  };

  if (req.method === "GET" || req.method === "HEAD") {
    let out = rows.filter((r) => matches(r, filters));
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = url.searchParams.get("limit");
    out = out.slice(offset, limit === null ? undefined : offset + Number(limit));
    return reply(200, out);
  }
  if (req.method === "POST") {
    const incoming = Array.isArray(json) ? json : [json];
    const key = url.searchParams.get("on_conflict") ?? pk;
    const out = [];
    const dupe = incoming.find((r) => rows.some((x) => x[key] === r[key]));
    if (dupe && !prefer.includes("resolution=")) {
      log.push(`INSERT ${table} 23505`);
      return send(res, 409, { code: "23505", message: `duplicate key value violates unique constraint "${table}_pkey"`, details: null, hint: null });
    }
    for (const r of incoming) {
      const existing = rows.find((x) => x[key] === r[key]);
      if (existing) {
        if (prefer.includes("merge-duplicates")) {
          Object.assign(existing, r);
          out.push(existing);
        }
        continue;
      }
      rows.push({ ...r }); out.push(r);
    }
    log.push(`INSERT ${table} x${incoming.length}`);
    return reply(201, out);
  }
  if (req.method === "PATCH") {
    const hit = rows.filter((r) => matches(r, filters));
    for (const r of hit) Object.assign(r, json);
    log.push(`UPDATE ${table} x${hit.length} ${JSON.stringify(json).slice(0, 80)}`);
    return reply(200, hit);
  }
  if (req.method === "DELETE") {
    const hit = rows.filter((r) => matches(r, filters));
    tables[table] = rows.filter((r) => !hit.includes(r));
    log.push(`DELETE ${table} x${hit.length}`);
    return reply(200, hit);
  }
  send(res, 405, { message: "method" });
}).listen(3999, "127.0.0.1", () => console.log("mock supabase on 127.0.0.1:3999, user", UID));
