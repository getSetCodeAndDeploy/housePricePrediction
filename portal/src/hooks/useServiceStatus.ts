"use client";

import { useEffect, useState } from "react";
import type { StatusResponse } from "@/lib/types";

/** Polls /api/status; pauses while the tab is hidden and cleans up on unmount. */
export function useServiceStatus(intervalMs = 15_000) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/status", { cache: "no-store" });
          if (!res.ok) throw new Error(String(res.status));
          const json = (await res.json()) as StatusResponse;
          if (!cancelled) {
            setData(json);
            setFailed(false);
          }
        } catch {
          if (!cancelled) setFailed(true);
        }
      }
      if (!cancelled) timer = setTimeout(load, intervalMs);
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return { data, failed, loading: data === null && !failed };
}
