"use client";

import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import DivergingBars from "@/components/charts/DivergingBars";
import { formatFeatureValue, formatPrice, formatPricePerSqft, formatSignedPrice } from "@/lib/format";
import { FIELDS } from "@/lib/validation";
import { useEstimatorStore } from "@/store/estimatorStore";
import type { Estimate } from "@/lib/types";

const labelOf = (key: string) => FIELDS.find((f) => f.key === key)?.label ?? key;
const unitOf = (key: string) => FIELDS.find((f) => f.key === key)?.unit;

export default function ResultPanel() {
  const estimate = useEstimatorStore((s) => s.history.find((h) => h.id === s.activeId) ?? null);

  return (
    <Card aria-live="polite">
      <CardHeader title="Estimate" description="Predicted price and what drives it" />
      <CardBody>
        {estimate ? (
          <Result estimate={estimate} />
        ) : (
          <EmptyState title="No estimate yet">Fill in the property details and press “Estimate price” — or use the example.</EmptyState>
        )}
      </CardBody>
    </Card>
  );
}

function Result({ estimate }: { estimate: Estimate }) {
  // Biggest drivers first (by size of effect), so the chart reads top-down by importance.
  const drivers = [...estimate.contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm text-muted">{estimate.label ?? `Estimate #${estimate.id}`}</p>
          {/* Hero figure: one per view, proportional figures at display size. */}
          <p className="text-5xl font-semibold tracking-tight" data-testid="predicted-price">
            {formatPrice(estimate.predicted_price)}
          </p>
        </div>
        <div className="text-right text-sm text-muted">
          <p>
            <span className="font-medium text-fg tabular-nums">{formatPricePerSqft(estimate.price_per_sqft)}</span> per sq ft
          </p>
          <p>
            Average home: <span className="tabular-nums">{formatPrice(estimate.baseline_price)}</span>
          </p>
        </div>
      </div>

      {estimate.warnings.length > 0 && (
        <div className="mt-4">
          <Alert tone="warning" title="Outside the range the model was trained on">
            <ul className="list-disc pl-4">
              {estimate.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-1">This estimate is an extrapolation and may be less reliable.</p>
          </Alert>
        </div>
      )}

      <h3 className="mt-6 text-sm font-semibold">What moves this price compared with an average home</h3>
      <div className="mt-3">
        <DivergingBars
          ariaLabel="Effect of each feature on the estimated price compared with an average home"
          format={formatSignedPrice}
          rows={drivers.map((c) => ({
            key: c.feature,
            label: labelOf(c.feature),
            value: c.contribution,
            note: `Yours ${formatFeatureValue(c.feature, c.value)} vs average ${formatFeatureValue(c.feature, c.average)}`,
          }))}
        />
      </div>

      <div className="mt-6 overflow-x-auto" role="region" aria-label="Estimate breakdown table" tabIndex={0}>
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">How each feature changes the estimate compared with an average home</caption>
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Feature</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">This property</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Average home</th>
              <th scope="col" className="py-2 text-right font-medium">Effect on price</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-b border-line">
              <th scope="row" className="py-2 pr-3 text-left font-medium">Average home (starting point)</th>
              <td className="py-2 pr-3 text-right text-muted">—</td>
              <td className="py-2 pr-3 text-right text-muted">—</td>
              <td className="py-2 text-right">{formatPrice(estimate.baseline_price)}</td>
            </tr>
            {drivers.map((c) => (
              <tr key={c.feature} className="border-b border-line">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {labelOf(c.feature)}
                  {unitOf(c.feature) && <span className="ml-1 text-xs text-muted">({unitOf(c.feature)})</span>}
                </th>
                <td className="py-2 pr-3 text-right">{formatFeatureValue(c.feature, c.value)}</td>
                <td className="py-2 pr-3 text-right text-muted">{formatFeatureValue(c.feature, c.average)}</td>
                <td className="py-2 text-right">{formatSignedPrice(c.contribution)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="tabular-nums">
            <tr>
              <th scope="row" className="py-2 pr-3 text-left font-semibold">Estimated price</th>
              <td colSpan={2} />
              <td className="py-2 text-right font-semibold">{formatPrice(estimate.predicted_price)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Badge tone="success">Saved</Badge> Added to your history as #{estimate.id}.
      </p>
    </div>
  );
}
