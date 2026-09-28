"use client";

import { useChartTooltip } from "./useChartTooltip";

export interface BarRow {
  key: string;
  label: string;
  value: number;
  note?: string;
}

/**
 * Horizontal bars for comparing magnitude across a few named items. One series => one colour (no legend box;
 * the caption above the chart says what is plotted) and the value sits at the tip of each bar.
 * Bars start from a single baseline at zero, so lengths are honest.
 */
export default function HBars({ rows, format, ariaLabel }: { rows: BarRow[]; format: (v: number) => string; ariaLabel: string }) {
  const { container, bind, tooltip } = useChartTooltip();
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <figure ref={container} className="relative" aria-label={ariaLabel}>
      <ul className="space-y-1" role="list">
        {rows.map((r) => (
          <li
            key={r.key}
            tabIndex={0}
            aria-label={`${r.label}: ${format(r.value)}`}
            className="grid grid-cols-[7.5rem_1fr_5.5rem] items-center gap-3 rounded px-1 py-1 hover:bg-surface-2 sm:grid-cols-[10rem_1fr_6rem]"
            {...bind({ title: r.label, value: format(r.value), note: r.note })}
          >
            <span className="truncate text-sm text-muted">{r.label}</span>
            <span className="relative block h-4" aria-hidden="true">
              <span className="absolute inset-y-[-4px] left-0 w-px bg-muted/50" />
              <span className="absolute left-0 top-0 h-4 rounded-r bg-chart-bar" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="text-right text-sm font-medium tabular-nums">{format(r.value)}</span>
          </li>
        ))}
      </ul>
      {tooltip}
    </figure>
  );
}
