"use client";

import { useElementWidth } from "@/hooks/useElementWidth";
import { niceTicks } from "./scale";
import { useChartTooltip } from "./useChartTooltip";

export interface Column {
  key: string;
  /** Short x-axis label. */
  label: string;
  value: number;
  /** Tooltip title, e.g. "$160k – $190k". */
  title: string;
}

const H = 220;
const M = { top: 10, right: 8, bottom: 30, left: 34 };

/**
 * Column chart for counts (distribution). One series => one colour, no legend box. Marks follow the dataviz spec:
 * columns <= 24px wide with a 4px rounded top and square baseline, hairline solid gridlines, y-axis ticks carry
 * the values (no number on every column). The whole slot is the hover/focus target, not just the painted column.
 */
export default function ColumnChart({ data, ariaLabel, unit = "homes" }: { data: Column[]; ariaLabel: string; unit?: string }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>();
  const { container, bind, tooltip } = useChartTooltip();
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const ticks = niceTicks(0, Math.max(1, ...data.map((d) => d.value)));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => M.top + innerH - (v / top) * innerH;
  const slot = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, slot * 0.6);

  return (
    <div ref={container} className="relative">
      <div ref={wrap}>
        <svg width={width} height={H} role="group" aria-label={ariaLabel} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted)">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = M.left + slot * i + slot / 2;
            const h = innerH - (y(d.value) - M.top);
            const r = Math.min(4, barW / 2, h);
            const x0 = cx - barW / 2;
            const yTop = y(d.value);
            return (
              <g
                key={d.key}
                tabIndex={0}
                role="img"
                aria-label={`${d.title}: ${d.value} ${unit}`}
                className="outline-none [&:focus-visible_.hit]:stroke-[var(--brand)]"
                {...bind({ title: d.title, value: `${d.value} ${unit}` }, yTop)}
              >
                <rect className="hit" x={M.left + slot * i} y={M.top} width={slot} height={innerH} fill="transparent" strokeWidth={2} rx={4} />
                {d.value > 0 && (
                  // 4px rounded data-end (top), square at the baseline.
                  <path
                    d={`M${x0},${yTop + h} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${yTop + h} Z`}
                    fill="var(--chart-bar)"
                    pointerEvents="none"
                  />
                )}
                <text x={cx} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--muted)" pointerEvents="none">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {tooltip}
    </div>
  );
}
