import { cn } from "@/lib/cn";

/** Placeholder block for loading states (decorative; the page-level loader carries the aria-live text). */
export default function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}
