"use client";

import { useChartTooltip } from "./useChartTooltip";

export interface DivergingRow {
  key: string;
  label: string;
  value: number;
  /** Extra line for the tooltip, e.g. "Yours 2,100 vs average 1,690". */
  note?: string;
}

/**
 * Horizontal diverging bars around a zero line (polarity: raises vs. lowers the price).
 * Blue = above the average home, red = below. Two hues that read as opposites, validated for colour-blind
 * separation; the sign is ALSO written in the value column, so colour is never the only signal.
 * Marks follow the dataviz spec: 16px bars (<= 24px), 4px rounded data-end and square at the baseline.
 */
export default function DivergingBars({
  rows,
  format,
  ariaLabel,
  posLabel = "Raises price",
  negLabel = "Lowers price",
}: {
  rows: DivergingRow[];
  format: (v: number) => string;
  ariaLabel: string;
  posLabel?: string;
  negLabel?: string;
}) {
  const { container, bind, tooltip } = useChartTooltip();
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));

  return (
    <figure ref={container} className="relative" aria-label={ariaLabel}>
      <ul className="space-y-1" role="list">
        {rows.map((r) => {
          const pct = (Math.abs(r.value) / max) * 100;
          const positive = r.value >= 0;
          const sign = positive ? posLabel : negLabel;
          return (
            <li
              key={r.key}
              tabIndex={0}
              aria-label={`${r.label}: ${format(r.value)} compared with an average home`}
              className="grid grid-cols-[7.5rem_1fr_5.5rem] items-center gap-3 rounded px-1 py-1 hover:bg-surface-2 sm:grid-cols-[10rem_1fr_6rem]"
              {...bind({ title: r.label, value: format(r.value), note: r.note ?? sign })}
            >
              <span className="truncate text-sm text-muted">{r.label}</span>
              {/* Track with a hairline zero line in the middle; bars grow outward from it. */}
              <span className="relative block h-4" aria-hidden="true">
                <span className="absolute inset-y-[-4px] left-1/2 w-px bg-muted/50" />
                <span
                  className={`absolute top-0 h-4 ${positive ? "left-1/2 rounded-r bg-chart-pos" : "right-1/2 rounded-l bg-chart-neg"}`}
                  style={{ width: `${pct / 2}%` }}
                />
              </span>
              <span className="text-right text-sm font-medium tabular-nums">{format(r.value)}</span>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-chart-neg" /> {negLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-chart-pos" /> {posLabel}
        </span>
      </figcaption>
      {tooltip}
    </figure>
  );
}
