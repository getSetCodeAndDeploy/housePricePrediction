"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { CompareResponse, Estimate } from "@/lib/types";

/**
 * Client state for the estimator: history (mirrors the server), which estimate is shown, the compare
 * selection and the last comparison. Server data is the source of truth; the store just keeps the UI
 * responsive (optimistic-free: we update it from confirmed API responses).
 *
 * The store is created PER PROVIDER (not a module-level singleton): client components are also rendered
 * on the server, and a global store would leak one visitor's data into another's request.
 */
export const MAX_COMPARE = 5;

export interface EstimatorState {
  history: Estimate[];
  total: number;
  activeId: number | null;
  selectedIds: number[];
  comparison: CompareResponse | null;

  added: (e: Estimate) => void;
  removed: (id: number) => void;
  cleared: () => void;
  view: (id: number) => void;
  toggleSelected: (id: number) => void;
  setComparison: (c: CompareResponse | null) => void;
}

function createEstimatorStore(initial: { items: Estimate[]; total: number }) {
  return createStore<EstimatorState>()((set) => ({
    history: initial.items,
    total: initial.total,
    activeId: initial.items[0]?.id ?? null,
    selectedIds: [],
    comparison: null,

    added: (e) => set((s) => ({ history: [e, ...s.history], total: s.total + 1, activeId: e.id })),
    removed: (id) =>
      set((s) => {
        const history = s.history.filter((h) => h.id !== id);
        const wasCompared = s.selectedIds.includes(id);
        return {
          history,
          total: Math.max(0, s.total - 1),
          activeId: s.activeId === id ? (history[0]?.id ?? null) : s.activeId,
          selectedIds: s.selectedIds.filter((x) => x !== id),
          comparison: wasCompared ? null : s.comparison, // a comparison containing a deleted item is stale
        };
      }),
    cleared: () => set({ history: [], total: 0, activeId: null, selectedIds: [], comparison: null }),
    view: (id) => set({ activeId: id }),
    toggleSelected: (id) =>
      set((s) => {
        if (s.selectedIds.includes(id)) return { selectedIds: s.selectedIds.filter((x) => x !== id) };
        if (s.selectedIds.length >= MAX_COMPARE) return s;
        return { selectedIds: [...s.selectedIds, id] };
      }),
    setComparison: (comparison) => set({ comparison }),
  }));
}

const Ctx = createContext<StoreApi<EstimatorState> | null>(null);

export function EstimatorStoreProvider({ initial, children }: { initial: { items: Estimate[]; total: number }; children: ReactNode }) {
  const ref = useRef<StoreApi<EstimatorState> | null>(null);
  if (!ref.current) ref.current = createEstimatorStore(initial);
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}

export function useEstimatorStore<T>(selector: (s: EstimatorState) => T): T {
  const store = useContext(Ctx);
  if (!store) throw new Error("useEstimatorStore must be used inside <EstimatorStoreProvider>");
  return useStore(store, selector);
}
