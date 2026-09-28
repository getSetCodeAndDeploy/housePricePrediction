"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import Spinner from "@/components/ui/Spinner";

interface MarketNav {
  /** True while the server is re-fetching for a new URL. */
  pending: boolean;
  params: URLSearchParams;
  navigate: (next: URLSearchParams) => void;
}

const Ctx = createContext<MarketNav | null>(null);

/**
 * URL is the state: filters, sorting and paging are search params, so changing them navigates and the Server
 * Component re-fetches. A transition keeps the previous render on screen while that happens - "refetch keeps
 * the frame": no skeleton flash, no layout jump. Loading is signalled with aria-busy and a small status badge,
 * not by dimming the content: an earlier version faded it to opacity-60, which dropped its text contrast to
 * ~2.6:1 (well under the WCAG AA 4.5:1 minimum) for as long as a fetch was in flight - caught by an axe-core
 * scan. Keeping content at full opacity avoids that regardless of how the badge is styled.
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
      <div aria-busy={pending} className="relative">
        {children}
        {pending && (
          <div className="pointer-events-none absolute inset-x-0 -top-3 z-10 flex justify-center" aria-hidden="true">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-md">
              <Spinner className="size-3.5" />
              Updating…
            </span>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useMarketNav(): MarketNav {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarketNav must be used inside <MarketShell>");
  return v;
}
