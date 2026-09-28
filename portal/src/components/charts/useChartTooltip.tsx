"use client";

import { useCallback, useRef, useState, type PointerEvent, type FocusEvent, type ReactNode } from "react";

interface Tip {
  top: number;
  left: number;
  title: string;
  value: string;
  note?: string;
}

/**
 * Shared hover/focus tooltip for the bar charts. Each bar row is the hit target (the whole row, not just the
 * painted bar) and shows the same details on pointer hover and keyboard focus. Tooltips only *enhance*:
 * every value is also in the row's value column and in the tables next to the charts.
 */
export function useChartTooltip() {
  const container = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const place = useCallback((row: Element, clientX: number | null, content: Omit<Tip, "top" | "left">, anchorY?: number) => {
    const box = container.current;
    if (!box) return;
    const c = box.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const x = clientX ?? r.left + r.width / 2;
    setTip({ ...content, top: anchorY ?? r.top - c.top, left: Math.min(Math.max(x - c.left, 80), c.width - 80) });
  }, []);

  /** `anchorY` (container coordinates) pins the tooltip to a mark's top edge, e.g. a column's tip. */
  const bind = useCallback(
    (content: Omit<Tip, "top" | "left">, anchorY?: number) => ({
      onPointerMove: (e: PointerEvent<Element>) => place(e.currentTarget, e.clientX, content, anchorY),
      onPointerLeave: () => setTip(null),
      onFocus: (e: FocusEvent<Element>) => place(e.currentTarget, null, content, anchorY),
      onBlur: () => setTip(null),
    }),
    [place],
  );

  const tooltip: ReactNode = tip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg"
      style={{ top: tip.top - 6, left: tip.left }}
    >
      <p className="text-sm font-semibold tabular-nums">{tip.value}</p>
      <p className="text-muted">{tip.title}</p>
      {tip.note && <p className="mt-0.5 text-muted">{tip.note}</p>}
    </div>
  ) : null;

  return { container, bind, tooltip };
}
