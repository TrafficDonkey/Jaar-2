const UPSTREAM_ORIGIN =
  process.env.UPSTREAM_ORIGIN ||
  "https://floraflow-dxdtbhedcjdganbw.francecentral-01.azurewebsites.net";

function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [String(value)];
}

function stripHopByHopHeaders(headers) {
  const hopByHop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
  ]);

  for (const key of Array.from(headers.keys())) {
    if (hopByHop.has(key.toLowerCase())) headers.delete(key);
  }
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  try {
    const pathSegments = toArray(req.query?.path);
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    const upstreamPath = pathSegments.length
      ? `/api/${pathSegments.map(encodeURIComponent).join("/")}`
      : "/api";

    const upstreamUrl = new URL(upstreamPath, UPSTREAM_ORIGIN);
    upstreamUrl.search = requestUrl.search;

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (v == null) continue;
      if (Array.isArray(v)) headers.set(k, v.join(","));
      else headers.set(k, String(v));
    }
    stripHopByHopHeaders(headers);

    const method = req.method || "GET";
    const body =
      method === "GET" || method === "HEAD" ? undefined : await readRawBody(req);

    const upstreamRes = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    // status
    res.statusCode = upstreamRes.status;

    // headers
    upstreamRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return; // set below
      res.setHeader(key, value);
    });

    // set-cookie (multiple)
    const setCookie =
      typeof upstreamRes.headers.getSetCookie === "function"
        ? upstreamRes.headers.getSetCookie()
        : upstreamRes.headers.get("set-cookie")
        ? [upstreamRes.headers.get("set-cookie")]
        : [];
    if (setCookie.length) res.setHeader("set-cookie", setCookie);

    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        message: "Proxy error",
        error: e?.message ?? String(e),
      })
    );
  }
}

