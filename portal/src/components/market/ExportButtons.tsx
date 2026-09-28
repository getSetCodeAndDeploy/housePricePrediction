"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { app2 } from "@/lib/api";
import { exportMarketPdf } from "@/lib/export-pdf";
import { filterParams, type MarketQuery } from "@/lib/market-query";
import type { MarketStats } from "@/lib/types";

/** CSV = a plain download link to the backend (works even without JS); PDF = generated in the browser on demand. */
export default function ExportButtons({ query, stats }: { query: MarketQuery; stats: MarketStats }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pdf() {
    setBusy(true);
    setError(null);
    try {
      await exportMarketPdf(query, stats);
    } catch {
      setError("Could not create the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={app2(`/api/houses/export.csv?${filterParams(query.filters)}`)}
        download="houses.csv"
        className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2"
      >
        Export CSV
      </a>
      <Button size="sm" variant="secondary" onClick={pdf} loading={busy}>
        {busy ? "Preparing PDF…" : "Export PDF"}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
