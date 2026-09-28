"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Button from "@/components/ui/Button";

/** Re-runs the server component (re-fetching data) without a full page reload. */
export default function RetryButton({ label = "Retry" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => start(() => router.refresh())}>
      {label}
    </Button>
  );
}
