import { Card } from "@/components/ui/Card";
import { formatNumber, formatPrice, formatPricePerSqft } from "@/lib/format";
import type { MarketSummary } from "@/lib/types";

/** KPI row: a handful of headline numbers as tiles (not a chart). Values use proportional figures. */
export default function StatTiles({ summary }: { summary: MarketSummary }) {
  const tiles = [
    { label: "Homes in segment", value: formatNumber(summary.count), sub: `Avg. ${formatNumber(Math.round(summary.avg_square_footage))} sq ft` },
    { label: "Average price", value: formatPrice(summary.avg_price), sub: `Std. deviation ${formatPrice(summary.std_dev_price)}` },
    { label: "Median price", value: formatPrice(summary.median_price), sub: `${formatPrice(summary.min_price)} – ${formatPrice(summary.max_price)}` },
    { label: "Average price per sq ft", value: formatPricePerSqft(summary.avg_price_per_sqft), sub: "Across the segment" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4">
          <dt className="text-sm text-muted">{t.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{t.value}</dd>
          <dd className="mt-1 text-xs text-muted">{t.sub}</dd>
        </Card>
      ))}
    </dl>
  );
}
