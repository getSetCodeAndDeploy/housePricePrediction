import { NextResponse } from "next/server";
import { APP1_API_URL, APP2_API_URL } from "@/lib/config";
import type { ServiceStatus, StatusResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

async function check(name: string, label: string, url: string, pick?: (b: unknown) => boolean): Promise<ServiceStatus> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { name, label, ok: false, detail: `HTTP ${res.status}` };
    const ok = pick ? pick(await res.json()) : true;
    return { name, label, ok, detail: ok ? undefined : "Unhealthy" };
  } catch {
    return { name, label, ok: false, detail: "Unreachable" };
  }
}

export async function GET() {
  const services = await Promise.all([
    // App 1's backend also verifies it can reach the model container, so this covers two services.
    check("model", "Model API", `${APP1_API_URL}/health/model`, (b) => (b as { model_api?: { model_loaded?: boolean } })?.model_api?.model_loaded === true),
    check("app1", "Estimator backend (Python)", `${APP1_API_URL}/health`),
    check("app2", "Market backend (Java)", `${APP2_API_URL}/actuator/health`, (b) => (b as { status?: string })?.status === "UP"),
  ]);
  const body: StatusResponse = { checked_at: new Date().toISOString(), services };
  return NextResponse.json(body);
}
