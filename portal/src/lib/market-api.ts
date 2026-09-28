import { APP2_API_URL } from "./config";
import { fetchJson } from "./api";
import { PAGE_SIZE, filterParams, type MarketQuery } from "./market-query";
import type { FeatureRange, HousesPage, MarketStats } from "./types";

/** Server-side fetchers for the market page (called from the Server Component). */
export const getStats = (q: MarketQuery) =>
  fetchJson<MarketStats>(`${APP2_API_URL}/api/market/stats?${filterParams(q.filters)}`, { cache: "no-store" });

export function getHouses(q: MarketQuery) {
  const p = filterParams(q.filters);
  p.set("sortBy", q.sortBy);
  p.set("dir", q.dir);
  p.set("page", String(q.page));
  p.set("size", String(PAGE_SIZE));
  return fetchJson<HousesPage>(`${APP2_API_URL}/api/houses?${p}`, { cache: "no-store" });
}

/** Feature min/max never change at runtime, so let Next cache it for an hour. */
export const getFeatureRanges = () =>
  fetchJson<FeatureRange[]>(`${APP2_API_URL}/api/meta/features`, { next: { revalidate: 3600 } });
