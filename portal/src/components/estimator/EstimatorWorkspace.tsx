"use client";

import { useEffect, useRef } from "react";
import ComparePanel from "./ComparePanel";
import EstimateForm from "./EstimateForm";
import HistoryTable from "./HistoryTable";
import ResultPanel from "./ResultPanel";
import { EstimatorStoreProvider, useEstimatorStore } from "@/store/estimatorStore";
import type { EstimatesPage } from "@/lib/types";

/** Client boundary for the estimator: receives the server-fetched history and owns all interactive state. */
export default function EstimatorWorkspace({ initial }: { initial: EstimatesPage }) {
  return (
    <EstimatorStoreProvider initial={initial}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <EstimateForm />
        <ResultPanel />
      </div>
      <div className="mt-6 space-y-6">
        <HistoryTable />
        <ComparePanelWithScroll />
      </div>
    </EstimatorStoreProvider>
  );
}

/** When a comparison appears, bring it into view (respecting reduced-motion). */
function ComparePanelWithScroll() {
  const hasComparison = useEstimatorStore((s) => s.comparison !== null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hasComparison) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [hasComparison]);
  return (
    <div ref={ref} className="scroll-mt-20">
      <ComparePanel />
    </div>
  );
}
