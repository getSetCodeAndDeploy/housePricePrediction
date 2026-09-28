"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface MarketNav {
  /** True while the server is re-fetching for a new URL. */
  pending: boolean;
  params: URLSearchParams;
  navigate: (next: URLSearchParams) => void;
}

const Ctx = createContext<MarketNav | null>(null);

/**
 * URL is the state: filters, sorting and paging are search params, so changing them navigates and the Server
 * Component re-fetches. A transition keeps the previous render on screen (dimmed, aria-busy) while that happens -
 * "refetch keeps the frame": no skeleton flash, no layout jump.
 */
export function MarketShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();

  const navigate = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [router, pathname],
  );

  const value = useMemo(() => ({ pending, params: new URLSearchParams(search.toString()), navigate }), [pending, search, navigate]);

  return (
    <Ctx.Provider value={value}>
      <div aria-busy={pending} className={cn("transition-opacity duration-200", pending && "opacity-60")}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useMarketNav(): MarketNav {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarketNav must be used inside <MarketShell>");
  return v;
}
