"use client";

import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatFeatureValue, formatNumber, formatPrice, formatPricePerSqft } from "@/lib/format";
import { PAGE_SIZE, pageParams, type MarketQuery, type SortKey } from "@/lib/market-query";
import type { HousesPage, MarketStats } from "@/lib/types";
import ExportButtons from "./ExportButtons";
import { useMarketNav } from "./MarketShell";

const COLUMNS: { key: SortKey; label: string; render: (r: HousesPage["items"][number]) => string }[] = [
  { key: "id", label: "ID", render: (r) => String(r.id) },
  { key: "square_footage", label: "Sq ft", render: (r) => formatFeatureValue("square_footage", r.square_footage) },
  { key: "bedrooms", label: "Beds", render: (r) => String(r.bedrooms) },
  { key: "bathrooms", label: "Baths", render: (r) => formatNumber(r.bathrooms) },
  { key: "year_built", label: "Year", render: (r) => String(r.year_built) },
  { key: "lot_size", label: "Lot (sq ft)", render: (r) => formatFeatureValue("lot_size", r.lot_size) },
  { key: "distance_to_city_center", label: "Distance", render: (r) => formatNumber(r.distance_to_city_center) },
  { key: "school_rating", label: "School", render: (r) => formatNumber(r.school_rating) },
  { key: "price", label: "Price", render: (r) => formatPrice(r.price) },
  { key: "price_per_sqft", label: "$ / sq ft", render: (r) => formatPricePerSqft(r.price_per_sqft) },
];

/** Server-side sorting and paging (URL-driven), so the table scales past what the browser should hold. */
export default function HousesTable({ data, query, stats }: { data: HousesPage; query: MarketQuery; stats: MarketStats }) {
  const { navigate } = useMarketNav();
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const from = data.total === 0 ? 0 : data.page * PAGE_SIZE + 1;
  const to = Math.min(data.total, (data.page + 1) * PAGE_SIZE);

  const go = (next: Partial<MarketQuery>) => navigate(pageParams({ ...query, ...next }));
  const sortBy = (key: SortKey) => go({ sortBy: key, dir: query.sortBy === key && query.dir === "asc" ? "desc" : "asc", page: 0 });

  return (
    <Card>
      <CardHeader title="Properties" description="Click a column heading to sort. Sorting and paging happen on the server." action={<ExportButtons query={query} stats={stats} />} />
      <CardBody className="p-0">
        <div className="overflow-x-auto" role="region" aria-label="Properties table" tabIndex={0}>
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">
              Properties sorted by {query.sortBy.replace(/_/g, " ")} ({query.dir === "asc" ? "ascending" : "descending"}), page {data.page + 1} of {totalPages}
            </caption>
            <thead>
              <tr className="border-b border-line text-muted">
                {COLUMNS.map((c) => {
                  const active = query.sortBy === c.key;
                  return (
                    <th key={c.key} scope="col" aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-right font-medium first:text-left">
                      <button type="button" onClick={() => sortBy(c.key)} className={`inline-flex items-center gap-1 rounded px-1 hover:text-fg ${active ? "text-fg" : ""}`}>
                        {c.label}
                        <span aria-hidden="true" className="w-3 text-xs">
                          {active ? (query.dir === "asc" ? "▲" : "▼") : ""}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.items.map((r) => (
                <tr key={r.id} className="border-b border-line hover:bg-surface-2">
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={`px-3 py-2 text-right first:text-left ${c.key === "price" ? "font-medium" : ""}`}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-muted">
                    This page is empty.{" "}
                    <button type="button" className="font-medium text-brand underline" onClick={() => go({ page: 0 })}>
                      Go to the first page
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
          <p className="text-muted" role="status">
            Showing <span className="tabular-nums">{from}–{to}</span> of <span className="tabular-nums">{data.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={data.page === 0} onClick={() => go({ page: data.page - 1 })}>
              Previous
            </Button>
            <span className="tabular-nums text-muted">
              Page {data.page + 1} of {totalPages}
            </span>
            <Button size="sm" variant="secondary" disabled={data.page + 1 >= totalPages} onClick={() => go({ page: data.page + 1 })}>
              Next
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
