"use client";

import { useState, type FormEvent } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { PRESETS, describeFilters, pageParams, parseQuery, sameFilters, type Filters, type FilterKey } from "@/lib/market-query";
import type { FeatureRange } from "@/lib/types";
import { useMarketNav } from "./MarketShell";

const inputCls = "h-9 w-full rounded-md border border-line bg-surface px-2 text-sm";

/**
 * One filter row above everything it scopes (price, bedrooms, year, living area) plus quick presets.
 * The form is remounted whenever the URL changes (key), so its fields always mirror the active filters.
 */
export default function FilterBar({ ranges, matching }: { ranges: FeatureRange[]; matching: number }) {
  const { params, navigate, pending } = useMarketNav();
  const query = parseQuery(Object.fromEntries(params));
  const [error, setError] = useState<string | null>(null);

  const bedRange = ranges.find((r) => r.feature === "bedrooms");
  const bedOptions = bedRange ? Array.from({ length: bedRange.max - bedRange.min + 1 }, (_, i) => bedRange.min + i) : [];

  function apply(filters: Filters) {
    setError(null);
    navigate(pageParams({ ...query, filters, page: 0 }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const filters: Filters = {};
    const problems: string[] = [];
    const pairs: [FilterKey, FilterKey, string][] = [
      ["minPrice", "maxPrice", "Price"],
      ["minBedrooms", "maxBedrooms", "Bedrooms"],
      ["minYear", "maxYear", "Year built"],
      ["minSqft", "maxSqft", "Living area"],
    ];
    for (const [lo, hi, label] of pairs) {
      for (const key of [lo, hi]) {
        const raw = String(data.get(key) ?? "").trim().replace(/[$,\s]/g, "");
        if (raw === "") continue;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) problems.push(`${label}: enter a positive number`);
        else filters[key] = n;
      }
      if (filters[lo] !== undefined && filters[hi] !== undefined && filters[lo]! > filters[hi]!) problems.push(`${label}: minimum is greater than maximum`);
    }
    if (problems.length) return setError([...new Set(problems)].join(". "));
    apply(filters);
  }

  const chips = describeFilters(query.filters);

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick filters">
          <span className="mr-1 text-sm font-medium">Segment</span>
          {PRESETS.map((p) => {
            const on = sameFilters(p.filters, query.filters);
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={on}
                onClick={() => apply(p.filters)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  on ? "border-brand bg-brand-soft font-medium text-brand" : "border-line bg-surface text-muted hover:text-fg",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <form key={params.toString()} onSubmit={onSubmit} noValidate className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RangeGroup legend="Price ($)" lo="minPrice" hi="maxPrice" filters={query.filters} placeholderLo="e.g. 200000" placeholderHi="e.g. 300000" />
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Bedrooms</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["minBedrooms", "maxBedrooms"] as const).map((k) => (
                  <select key={k} name={k} aria-label={k === "minBedrooms" ? "Minimum bedrooms" : "Maximum bedrooms"} defaultValue={query.filters[k] ?? ""} className={inputCls}>
                    <option value="">{k === "minBedrooms" ? "Min: any" : "Max: any"}</option>
                    {bedOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </fieldset>
            <RangeGroup legend="Year built" lo="minYear" hi="maxYear" filters={query.filters} placeholderLo="e.g. 1990" placeholderHi="e.g. 2010" />
            <RangeGroup legend="Living area (sq ft)" lo="minSqft" hi="maxSqft" filters={query.filters} placeholderLo="e.g. 1200" placeholderHi="e.g. 2000" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" loading={pending}>
              Apply filters
            </Button>
            <Button size="sm" variant="ghost" onClick={() => apply({})} disabled={chips.length === 0}>
              Clear
            </Button>
            <p role="status" className="ml-auto text-sm text-muted">
              <span className="font-medium text-fg tabular-nums">{matching}</span> {matching === 1 ? "home matches" : "homes match"}
            </p>
          </div>
          <div aria-live="polite">{error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}</div>
        </form>

        {chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c}>
                <Badge tone="brand">{c}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function RangeGroup({ legend, lo, hi, filters, placeholderLo, placeholderHi }: { legend: string; lo: FilterKey; hi: FilterKey; filters: Filters; placeholderLo: string; placeholderHi: string }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        <input name={lo} inputMode="numeric" aria-label={`${legend} minimum`} placeholder={placeholderLo} defaultValue={filters[lo] ?? ""} className={inputCls} />
        <input name={hi} inputMode="numeric" aria-label={`${legend} maximum`} placeholder={placeholderHi} defaultValue={filters[hi] ?? ""} className={inputCls} />
      </div>
    </fieldset>
  );
}
