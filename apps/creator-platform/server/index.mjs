import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

const PORT = Number(process.env.API_PORT || 8787);
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || `http://localhost:${PORT}/api/tiktok/callback`;
const API = "https://open.tiktokapis.com";
const sessions = new Map();
const pendingStates = new Map();

const json = (res, status, value) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
};
const cookieValue = (req, name) => {
  const entry = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
};
const randomId = () => randomBytes(32).toString("hex");
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
};
async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body too large");
  }
  return body ? JSON.parse(body) : {};
}
async function tiktokToken(form) {
  const response = await fetch(`${API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body: new URLSearchParams(form),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description || data.error || "TikTok token request failed");
  return data;
}
async function authorizedFetch(session, path, body) {
  if (!session?.tokens?.access_token) throw new Error("TikTok account is not connected.");
  if (Date.now() > session.expiresAt - 60_000) {
    const refreshed = await tiktokToken({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: session.tokens.refresh_token,
    });
    session.tokens = { ...session.tokens, ...refreshed };
    session.expiresAt = Date.now() + Number(refreshed.expires_in || 86400) * 1000;
  }
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.tokens.access_token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.error?.code && data.error.code !== "ok") {
    throw new Error(data.error?.message || "TikTok API request failed");
  }
  return data;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const sessionId = cookieValue(req, "creatorforge_session");
  let session = sessions.get(sessionId);

  if (url.pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, { ok: true, service: "creatorforge-api", tiktokConfigured: Boolean(CLIENT_KEY && CLIENT_SECRET) });
  }
  if (url.pathname === "/api/tiktok/connect" && req.method === "GET") {
    if (!CLIENT_KEY || !CLIENT_SECRET) return json(res, 503, { error: "Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to apps/creator-platform/.env first." });
    const id = sessionId || randomId();
    session = session || { createdAt: Date.now(), tokens: null };
    sessions.set(id, session);
    const state = randomId();
    pendingStates.set(state, { sessionId: id, expiresAt: Date.now() + 10 * 60_000 });
    res.writeHead(302, {
      "set-cookie": `creatorforge_session=${encodeURIComponent(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
      location: `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(CLIENT_KEY)}&response_type=code&scope=${encodeURIComponent("user.info.basic,video.list")}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`,
      "cache-control": "no-store",
    });
    return res.end();
  }
  if (url.pathname === "/api/tiktok/callback" && req.method === "GET") {
    const state = url.searchParams.get("state") || "";
    const pending = pendingStates.get(state);
    pendingStates.delete(state);
    if (!pending || pending.expiresAt < Date.now() || !safeEqual(pending.sessionId, sessionId)) {
      return json(res, 400, { error: "TikTok authorization state was invalid or expired. Try connecting again." });
    }
    if (url.searchParams.get("error")) return json(res, 400, { error: url.searchParams.get("error_description") || url.searchParams.get("error") });
    try {
      const tokens = await tiktokToken({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code: url.searchParams.get("code") || "",
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      });
      const target = sessions.get(pending.sessionId);
      target.tokens = tokens;
      target.expiresAt = Date.now() + Number(tokens.expires_in || 86400) * 1000;
      return res.writeHead(302, { location: "http://localhost:5173/?tiktok=connected", "cache-control": "no-store" }).end();
    } catch (error) {
      return json(res, 502, { error: error.message });
    }
  }
  if (url.pathname === "/api/tiktok/status" && req.method === "GET") {
    return json(res, 200, { connected: Boolean(session?.tokens?.access_token), note: "Local development stores tokens in memory only; restarting the API disconnects the session." });
  }
  if (url.pathname === "/api/tiktok/disconnect" && req.method === "POST") {
    if (sessionId) sessions.delete(sessionId);
    res.writeHead(200, { "set-cookie": "creatorforge_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0", "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify({ connected: false }));
  }
  if (url.pathname === "/api/tiktok/videos" && req.method === "GET") {
    if (!session?.tokens?.access_token) return json(res, 401, { error: "Connect your TikTok account first." });
    try {
      const fields = "id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,like_count,comment_count,share_count,view_count";
      const result = await authorizedFetch(session, `/v2/video/list/?fields=${fields}`, { max_count: 20 });
      const videos = (result.data?.videos || []).map((video) => ({
        id: video.id,
        createdAt: video.create_time,
        coverImageUrl: video.cover_image_url,
        shareUrl: video.share_url,
        description: video.video_description || video.title || "",
        duration: video.duration,
        width: video.width,
        height: video.height,
        views: video.view_count,
        likes: video.like_count,
        comments: video.comment_count,
        shares: video.share_count,
      }));
      return json(res, 200, { videos, hasMore: Boolean(result.data?.has_more), cursor: result.data?.cursor ?? null, source: "TikTok Display API", fetchedAt: new Date().toISOString() });
    } catch (error) {
      return json(res, 502, { error: error.message });
    }
  }
  return json(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`CreatorForge API listening at http://localhost:${PORT}`);
  if (!CLIENT_KEY || !CLIENT_SECRET) console.log("TikTok is not configured. Copy .env.example to .env and add your developer app credentials.");
});
