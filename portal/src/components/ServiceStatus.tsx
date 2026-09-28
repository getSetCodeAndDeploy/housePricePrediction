"use client";

import { useServiceStatus } from "@/hooks/useServiceStatus";
import { cn } from "@/lib/cn";

/** Footer indicator showing which backends are up - handy proof that the stack is healthy during a live demo. */
export default function ServiceStatus() {
  const { data, failed, loading } = useServiceStatus();

  return (
    <section aria-label="Service status" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
      <span className="font-medium">Services</span>
      {loading && <span role="status">Checking…</span>}
      {failed && !data && <span className="text-danger">Status unavailable</span>}
      {data?.services.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2 rounded-full", s.ok ? "bg-success" : "bg-danger")} />
          {s.label}: <span className={s.ok ? "text-success" : "text-danger"}>{s.ok ? "up" : (s.detail ?? "down")}</span>
        </span>
      ))}
    </section>
  );
}
