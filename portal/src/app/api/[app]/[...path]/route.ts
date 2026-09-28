import { NextRequest, NextResponse } from "next/server";
import { UPSTREAMS, type UpstreamName } from "@/lib/config";

/**
 * Backend-for-frontend proxy: /api/app1/api/estimates -> APP1_API_URL/api/estimates.
 * The browser only ever talks to the portal, so there is no CORS and internal service names stay private.
 * Only /api/* paths are forwarded (health/actuator endpoints are not exposed).
 */
const TIMEOUT_MS = 15_000;
const FORWARD_HEADERS = ["content-type", "content-disposition"];

async function proxy(req: NextRequest, ctx: { params: Promise<{ app: string; path: string[] }> }) {
  const { app, path } = await ctx.params;
  if (!(app in UPSTREAMS)) return NextResponse.json({ detail: "Unknown service" }, { status: 404 });
  if (path[0] !== "api") return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const target = `${UPSTREAMS[app as UpstreamName]}/${path.join("/")}${req.nextUrl.search}`;
  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { "content-type": req.headers.get("content-type") ?? "application/json" },
      body: hasBody ? await req.text() : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const headers = new Headers();
    for (const h of FORWARD_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === "TimeoutError";
    return NextResponse.json(
      { detail: timedOut ? "The service took too long to respond" : "The service is unreachable" },
      { status: timedOut ? 504 : 503 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as DELETE };
