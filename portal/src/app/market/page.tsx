import type { Metadata } from "next";
import { ApiError } from "@/lib/api";
import { getFeatureRanges, getHouses, getStats } from "@/lib/market-api";
import { parseQuery } from "@/lib/market-query";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import Tabs from "@/components/ui/Tabs";
import RetryButton from "@/components/RetryButton";
import { MarketShell } from "@/components/market/MarketShell";
import FilterBar from "@/components/market/FilterBar";
import StatTiles from "@/components/market/StatTiles";
import MarketCharts from "@/components/market/MarketCharts";
import HousesTable from "@/components/market/HousesTable";
import ResetFiltersButton from "@/components/market/ResetFiltersButton";
import WhatIfTool from "@/components/market/WhatIfTool";

export const metadata: Metadata = { title: "Market Analysis" };
export const dynamic = "force-dynamic";

/**
 * Server Component. The URL (search params) describes the view: filters, sort, page. We fetch stats, the current
 * page of houses and the feature ranges in parallel on the server, then hand plain data to the client components.
 * Backend outages render an inline error with Retry; anything unexpected falls through to error.tsx.
 */
export default async function MarketPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseQuery(await searchParams);

  let data: Awaited<ReturnType<typeof load>> | null = null;
  let error: ApiError | null = null;
  try {
    data = await load(query);
  } catch (e) {
    if (e instanceof ApiError) error = e;
    else throw e;
  }

  return (
    <>
      <PageHeader title="Market Analysis" description="Explore market statistics for any property segment, export the data, and test what-if scenarios on the regression model." />
      {data ? (
        <Tabs
          label="Market analysis sections"
          tabs={[
            {
              id: "overview",
              label: "Market overview",
              panel: (
                <MarketShell>
                  <div className="space-y-6">
                    <FilterBar ranges={data.ranges} matching={data.stats.summary.count} />
                    {data.stats.summary.count === 0 ? (
                      <EmptyState title="No homes match these filters">
                        <p>Try widening the price, bedroom or year range.</p>
                        <div className="mt-3">
                          <ResetFiltersButton />
                        </div>
                      </EmptyState>
                    ) : (
                      <>
                        <StatTiles summary={data.stats.summary} />
                        <MarketCharts stats={data.stats} />
                        <HousesTable data={data.houses} query={query} stats={data.stats} />
                      </>
                    )}
                  </div>
                </MarketShell>
              ),
            },
            { id: "whatif", label: "What-if analysis", panel: <WhatIfTool ranges={data.ranges} /> },
          ]}
        />
      ) : (
        <Alert tone="error" title="The market backend is unavailable" action={<RetryButton />}>
          {error?.message}
        </Alert>
      )}
    </>
  );
}

async function load(query: ReturnType<typeof parseQuery>) {
  const [stats, houses, ranges] = await Promise.all([getStats(query), getHouses(query), getFeatureRanges()]);
  return { stats, houses, ranges };
}
