"use client";

import Button from "@/components/ui/Button";
import { useMarketNav } from "./MarketShell";

export default function ResetFiltersButton() {
  const { navigate } = useMarketNav();
  return (
    <Button variant="secondary" size="sm" onClick={() => navigate(new URLSearchParams())}>
      Clear all filters
    </Button>
  );
}
