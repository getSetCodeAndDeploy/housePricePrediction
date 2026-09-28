"use client";

import { useCallback, useState } from "react";
import { ApiError, app1, fetchJson } from "@/lib/api";
import type { CompareResponse, Estimate, PropertyFeatures } from "@/lib/types";
import { useEstimatorStore } from "@/store/estimatorStore";

type Busy = "creating" | "comparing" | "deleting" | null;

/** Outcome of an API action: callers branch on `ok` instead of guessing from null. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * All App 1 API interactions in one place. The store is updated only from confirmed server responses,
 * and every failure is surfaced as an ApiError (so the UI never silently swallows problems).
 */
export function useEstimates() {
  const added = useEstimatorStore((s) => s.added);
  const removed = useEstimatorStore((s) => s.removed);
  const cleared = useEstimatorStore((s) => s.cleared);
  const setComparison = useEstimatorStore((s) => s.setComparison);
  const selectedIds = useEstimatorStore((s) => s.selectedIds);

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(async <T,>(kind: Exclude<Busy, null>, fn: () => Promise<T>): Promise<Result<T>> => {
    setBusy(kind);
    setError(null);
    try {
      return { ok: true, data: await fn() };
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("Something went wrong. Please try again.", 500);
      setError(err);
      return { ok: false, error: err };
    } finally {
      setBusy(null);
    }
  }, []);

  const create = useCallback(
    (features: PropertyFeatures, label: string) =>
      run("creating", async () => {
        const est = await fetchJson<Estimate>(app1("/api/estimates"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...features, label: label.trim() || null }),
        });
        added(est);
        return est;
      }),
    [run, added],
  );

  const remove = useCallback(
    (id: number) =>
      run("deleting", async () => {
        await fetchJson<void>(app1(`/api/estimates/${id}`), { method: "DELETE" });
        removed(id);
        return true;
      }),
    [run, removed],
  );

  const clearAll = useCallback(
    () =>
      run("deleting", async () => {
        await fetchJson<{ deleted: number }>(app1("/api/estimates"), { method: "DELETE" });
        cleared();
        return true;
      }),
    [run, cleared],
  );

  const compareSelected = useCallback(
    () =>
      run("comparing", async () => {
        const res = await fetchJson<CompareResponse>(app1("/api/compare"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        setComparison(res);
        return res;
      }),
    [run, selectedIds, setComparison],
  );

  return { busy, error, clearError: () => setError(null), create, remove, clearAll, compareSelected };
}
