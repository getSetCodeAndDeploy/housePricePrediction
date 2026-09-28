"use client";

import Alert from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import ColumnChart from "@/components/charts/ColumnChart";
import HBars from "@/components/charts/HBars";
import { compactPrice } from "@/components/charts/scale";
import { formatPrice, formatPricePerSqft } from "@/lib/format";
import type { GroupStat, MarketStats } from "@/lib/types";
import { FIELDS } from "@/lib/validation";

const featureLabel = (k: string) => FIELDS.find((f) => f.key === k)?.label ?? k;

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted hover:text-fg">Show data table</summary>
      <div className="mt-2 overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-left text-muted">
              {head.map((h, i) => (
                <th key={h} scope="col" className={`py-1.5 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line">
                {r.map((c, j) => (
                  <td key={j} className={`py-1.5 pr-3 ${j > 0 ? "text-right" : ""}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const groupRows = (g: GroupStat[], noun: (k: string) => string) =>
  g.map((s) => ({ key: s.key, label: noun(s.key), value: s.avg_price, note: `${s.count} homes · ${formatPricePerSqft(s.avg_price_per_sqft)} per sq ft` }));

export default function MarketCharts({ stats }: { stats: MarketStats }) {
  const bins = stats.price_histogram;
  const beds = groupRows(stats.by_bedrooms, (k) => `${k} bedrooms`);
  const decades = groupRows(stats.by_decade_built, (k) => k);
  const corr = [...stats.price_correlations].sort((a, b) => b.r - a.r);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Price distribution" description="Number of homes in each price band" />
        <CardBody>
          <ColumnChart
            ariaLabel="Number of homes in each price band"
            data={bins.map((b, i) => ({ key: String(i), label: compactPrice((b.from + b.to) / 2), title: `${formatPrice(b.from)} – ${formatPrice(b.to)}`, value: b.count }))}
          />
          <DataTable caption="Price distribution data" head={["Price band", "Homes"]} rows={bins.map((b) => [`${formatPrice(b.from)} – ${formatPrice(b.to)}`, b.count])} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Average price by bedrooms" description="Larger homes cost more; hover a bar for price per sq ft" />
        <CardBody>
          <HBars ariaLabel="Average price by number of bedrooms" format={formatPrice} rows={beds} />
          <DataTable caption="Average price by bedrooms" head={["Bedrooms", "Homes", "Average price", "Per sq ft"]} rows={stats.by_bedrooms.map((s) => [s.key, s.count, formatPrice(s.avg_price), formatPricePerSqft(s.avg_price_per_sqft)])} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Average price by decade built" description="Newer homes command higher prices in this data" />
        <CardBody>
          <HBars ariaLabel="Average price by decade built" format={formatPrice} rows={decades} />
          <DataTable caption="Average price by decade built" head={["Decade", "Homes", "Average price", "Per sq ft"]} rows={stats.by_decade_built.map((s) => [s.key, s.count, formatPrice(s.avg_price), formatPricePerSqft(s.avg_price_per_sqft)])} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How closely each feature tracks price" description="Correlation with price (1.0 = moves in lockstep)" />
        <CardBody>
          <HBars
            ariaLabel="Correlation of each feature with price"
            format={(v) => v.toFixed(2)}
            rows={corr.map((c) => ({ key: c.feature, label: featureLabel(c.feature), value: c.r, note: "Correlation with price" }))}
          />
          <div className="mt-3">
            <Alert tone="info" title="Why the bars look alike">
              Every feature is strongly linked to price <em>and to each other</em> (bigger homes are also newer, on larger lots, in better school districts), so the model cannot cleanly separate their individual effects.
            </Alert>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
