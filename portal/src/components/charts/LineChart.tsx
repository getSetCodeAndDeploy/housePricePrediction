"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { niceTicks } from "./scale";

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineMarker {
  x: number;
  y: number;
  label: string;
}

const H = 260;
const M = { top: 16, right: 16, bottom: 34, left: 58 };

/**
 * Single-series line chart (price vs. one feature). 2px line, ~10% area wash, hairline solid gridlines.
 * A vertical crosshair follows the pointer and snaps to the nearest data point; the same readout is reachable by
 * keyboard (focus the chart, then Left/Right/Home/End). Optional markers (>= 8px, 2px surface ring) flag the
 * current and scenario values, and each has a direct text label.
 */
export default function LineChart({
  points,
  markers = [],
  xFormat,
  yFormat,
  xLabel,
  ariaLabel,
}: {
  points: LinePoint[];
  markers?: LineMarker[];
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  xLabel: string;
  ariaLabel: string;
}) {
  const [wrap, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const xs = points.map((p) => p.x);
  const ys = [...points.map((p) => p.y), ...markers.map((m) => m.y)];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yTicks = niceTicks(Math.min(...ys), Math.max(...ys), 4);
  const yLo = yTicks[0];
  const yHi = yTicks[yTicks.length - 1];
  const sx = (v: number) => M.left + (xMax === xMin ? innerW / 2 : ((v - xMin) / (xMax - xMin)) * innerW);
  const sy = (v: number) => M.top + innerH - ((v - yLo) / (yHi - yLo || 1)) * innerH;
  const xTicks = niceTicks(xMin, xMax, Math.max(2, Math.min(5, Math.floor(innerW / 110)))).filter((t) => t >= xMin && t <= xMax);

  const line = points.map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${sy(p.y)}`).join(" ");
  const area = `${line} L${sx(xMax)},${sy(yLo)} L${sx(xMin)},${sy(yLo)} Z`;

  function nearest(clientX: number) {
    const box = svgRef.current!.getBoundingClientRect();
    const px = clientX - box.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(sx(points[i].x) - px) < Math.abs(sx(points[best].x) - px)) best = i;
    return best;
  }

  function onKey(e: KeyboardEvent) {
    const cur = active ?? 0;
    const next = e.key === "ArrowRight" ? Math.min(points.length - 1, cur + 1) : e.key === "ArrowLeft" ? Math.max(0, cur - 1) : e.key === "Home" ? 0 : e.key === "End" ? points.length - 1 : null;
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  }

  const a = active !== null ? points[active] : null;
  const tipLeft = a ? Math.min(Math.max(sx(a.x), 90), width - 90) : 0;

  return (
    <div className="relative">
      <div ref={wrap}>
        <svg
          ref={svgRef}
          width={width}
          height={H}
          tabIndex={0}
          role="img"
          aria-label={`${ariaLabel}. Use the left and right arrow keys to read values.`}
          className="block overflow-visible rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]"
          onPointerMove={(e: PointerEvent) => setActive(nearest(e.clientX))}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onFocus={() => setActive((v) => v ?? 0)}
          onBlur={() => setActive(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={M.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted)">
                {yFormat(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={sx(t)} y={H - 14} textAnchor="middle" fontSize={11} fill="var(--muted)">
              {xFormat(t)}
            </text>
          ))}
          <text x={M.left + innerW / 2} y={H - 1} textAnchor="middle" fontSize={11} fill="var(--muted)">
            {xLabel}
          </text>

          <path d={area} fill="var(--chart-bar)" opacity={0.1} />
          <path d={line} fill="none" stroke="var(--chart-bar)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {markers.map((m) => (
            <g key={m.label}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={5} fill="var(--chart-bar)" stroke="var(--surface)" strokeWidth={2} />
              <text x={sx(m.x)} y={sy(m.y) - 12} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--fg)">
                {m.label}
              </text>
            </g>
          ))}

          {a && (
            <g pointerEvents="none">
              <line x1={sx(a.x)} x2={sx(a.x)} y1={M.top} y2={M.top + innerH} stroke="var(--muted)" strokeWidth={1} />
              <circle cx={sx(a.x)} cy={sy(a.y)} r={5} fill="var(--chart-bar)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
      </div>
      {a && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: tipLeft, top: 0 }}
        >
          <p className="text-sm font-semibold tabular-nums">{yFormat(a.y)}</p>
          <p className="text-muted">
            {xLabel}: {xFormat(a.x)}
          </p>
        </div>
      )}
    </div>
  );
}
