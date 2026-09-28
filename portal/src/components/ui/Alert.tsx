import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "warning" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "border-danger/40 bg-danger-soft text-danger",
  warning: "border-warn/40 bg-warn-soft text-warn",
  success: "border-success/40 bg-success-soft text-success",
  info: "border-brand/40 bg-brand-soft text-brand",
};

/** Errors use role="alert" (announced immediately); everything else role="status" (polite). */
export default function Alert({ tone = "info", title, children, action }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start justify-between gap-4 rounded-md border p-4", tones[tone])}>
      <div className="text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-fg/90")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
