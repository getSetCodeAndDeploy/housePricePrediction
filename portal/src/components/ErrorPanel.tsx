"use client";

import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";

/**
 * Shared UI for route-level error boundaries (error.tsx). In production Next.js redacts the message of
 * server-side errors, so we show a friendly generic text plus the digest for log correlation.
 */
export default function ErrorPanel({ error, reset, area }: { error: Error & { digest?: string }; reset: () => void; area: string }) {
  return (
    <Alert
      tone="error"
      title={`${area} hit a problem`}
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          Try again
        </Button>
      }
    >
      Something unexpected went wrong while loading this page.
      {error.digest && <span className="mt-1 block font-mono text-xs text-muted">Reference: {error.digest}</span>}
    </Alert>
  );
}
