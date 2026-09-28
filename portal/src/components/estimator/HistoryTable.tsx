"use client";

import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useEstimates } from "@/hooks/useEstimates";
import { formatFeatureValue, formatNumber, formatPrice } from "@/lib/format";
import { MAX_COMPARE, useEstimatorStore } from "@/store/estimatorStore";

export default function HistoryTable() {
  const history = useEstimatorStore((s) => s.history);
  const total = useEstimatorStore((s) => s.total);
  const activeId = useEstimatorStore((s) => s.activeId);
  const selectedIds = useEstimatorStore((s) => s.selectedIds);
  const view = useEstimatorStore((s) => s.view);
  const toggleSelected = useEstimatorStore((s) => s.toggleSelected);
  const { busy, error, remove, clearAll, compareSelected } = useEstimates();
  const [confirmClear, setConfirmClear] = useState(false);

  const canCompare = selectedIds.length >= 2;
  const atLimit = selectedIds.length >= MAX_COMPARE;

  return (
    <Card>
      <CardHeader
        title="History"
        description={history.length ? `Select 2–${MAX_COMPARE} estimates to compare them side by side.` : "Your saved estimates appear here."}
        action={
          history.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button size="sm" onClick={compareSelected} disabled={!canCompare} loading={busy === "comparing"}>
                Compare{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              </Button>
              {confirmClear ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy === "deleting"}
                    onClick={async () => {
                      const r = await clearAll();
                      if (r.ok) setConfirmClear(false);
                    }}
                  >
                    Yes, delete all
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
                  Clear all
                </Button>
              )}
            </div>
          )
        }
      />
      <CardBody className="p-0">
        {error && (
          <div className="p-4">
            <Alert tone="error">{error.message}</Alert>
          </div>
        )}
        {history.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No saved estimates">Every estimate you make is saved automatically.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="Estimate history table" tabIndex={0}>
            <table className="w-full min-w-[42rem] text-sm">
              <caption className="sr-only">Previous estimates, newest first</caption>
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="w-10 px-4 py-2 font-medium">
                    <span className="sr-only">Select for comparison</span>
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">Property</th>
                  <th scope="col" className="py-2 pr-3 font-medium">When</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Sq ft</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Bed / bath</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Year</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Estimate</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {history.map((h) => {
                  const name = h.label ?? `Estimate #${h.id}`;
                  const checked = selectedIds.includes(h.id);
                  return (
                    <tr key={h.id} className={`border-b border-line ${h.id === activeId ? "bg-brand-soft/50" : ""}`}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--brand)]"
                          checked={checked}
                          disabled={!checked && atLimit}
                          onChange={() => toggleSelected(h.id)}
                          aria-label={`Select ${name} for comparison`}
                        />
                      </td>
                      <th scope="row" className="py-2 pr-3 text-left font-medium">
                        {name} {h.id === activeId && <Badge tone="brand">Shown</Badge>}
                      </th>
                      <td className="py-2 pr-3 text-muted">
                        {/* Rendered in the viewer's local time, so server and browser text can differ. */}
                        <time dateTime={h.created_at} suppressHydrationWarning>
                          {new Date(h.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        </time>
                      </td>
                      <td className="py-2 pr-3 text-right">{formatFeatureValue("square_footage", h.features.square_footage)}</td>
                      <td className="py-2 pr-3 text-right">
                        {h.features.bedrooms} / {formatNumber(h.features.bathrooms)}
                      </td>
                      <td className="py-2 pr-3 text-right">{h.features.year_built}</td>
                      <td className="py-2 pr-3 text-right font-medium">{formatPrice(h.predicted_price)}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => view(h.id)} aria-label={`View ${name}`}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy === "deleting"} onClick={() => remove(h.id)} aria-label={`Delete ${name}`}>
                            Delete
                          </Button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {total > history.length && (
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Showing the latest {history.length} of {total} estimates.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
