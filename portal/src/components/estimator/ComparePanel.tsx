"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import HBars from "@/components/charts/HBars";
import { formatFeatureValue, formatPrice, formatPricePerSqft, formatSignedPercent, formatSignedPrice } from "@/lib/format";
import { FIELDS } from "@/lib/validation";
import { useEstimatorStore } from "@/store/estimatorStore";

export default function ComparePanel() {
  const comparison = useEstimatorStore((s) => s.comparison);
  const setComparison = useEstimatorStore((s) => s.setComparison);
  if (!comparison) return null;

  const { rows, best_value_label } = comparison;
  const bestIndex = rows.findIndex((r) => r.label === best_value_label);

  return (
    <Card id="comparison" aria-labelledby="compare-title">
      <CardHeader
        title="Side-by-side comparison"
        description="The first property is the reference for the differences shown."
        action={
          <Button size="sm" variant="secondary" onClick={() => setComparison(null)}>
            Close
          </Button>
        }
      />
      <CardBody>
        <h3 id="compare-title" className="text-sm font-semibold">Estimated price</h3>
        <div className="mt-3">
          <HBars
            ariaLabel="Estimated price of each compared property"
            format={formatPrice}
            rows={rows.map((r, i) => ({
              key: `${i}-${r.label}`,
              label: r.label,
              value: r.predicted_price,
              note: `${formatPricePerSqft(r.price_per_sqft)} per sq ft`,
            }))}
          />
        </div>

        <div className="mt-6 overflow-x-auto" role="region" aria-label="Comparison table" tabIndex={0}>
          <table className="w-full min-w-[32rem] text-sm">
            <caption className="sr-only">Compared properties side by side</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="py-2 pr-3 font-medium text-muted">
                  <span className="sr-only">Measure</span>
                </th>
                {rows.map((r, i) => (
                  <th key={`${i}-${r.label}`} scope="col" className="py-2 pr-3 text-right font-semibold">
                    <span className="block">{r.label}</span>
                    {i === bestIndex && <Badge tone="success">Best value per sq ft</Badge>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <Row label="Estimated price" values={rows.map((r) => formatPrice(r.predicted_price))} strong />
              <Row label="Price per sq ft" values={rows.map((r) => formatPricePerSqft(r.price_per_sqft))} />
              <Row
                label="Difference vs first"
                values={rows.map((r, i) => (i === 0 ? "—" : `${formatSignedPrice(r.diff_vs_first)} (${formatSignedPercent(r.diff_vs_first_pct)})`))}
              />
              {FIELDS.map((f) => (
                <Row key={f.key} label={f.label} values={rows.map((r) => formatFeatureValue(f.key, r.features[f.key]))} muted />
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function Row({ label, values, strong, muted }: { label: string; values: string[]; strong?: boolean; muted?: boolean }) {
  return (
    <tr className="border-b border-line">
      <th scope="row" className={`py-2 pr-3 text-left ${strong ? "font-semibold" : "font-normal text-muted"}`}>
        {label}
      </th>
      {values.map((v, i) => (
        <td key={i} className={`py-2 pr-3 text-right ${strong ? "font-semibold" : ""} ${muted ? "text-muted" : ""}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}
