import { formatPrice } from "./format";

/**
 * The market dashboard's state lives in the URL (?minPrice=200000&sortBy=price&dir=desc&page=1):
 * filtered views are shareable/bookmarkable, back/forward work, and the Server Component re-fetches
 * exactly what the URL describes. These helpers parse and build that query safely.
 */
export const FILTER_KEYS = ["minPrice", "maxPrice", "minBedrooms", "maxBedrooms", "minYear", "maxYear", "minSqft", "maxSqft"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Filters = Partial<Record<FilterKey, number>>;

export const SORT_KEYS = ["id", "square_footage", "bedrooms", "bathrooms", "year_built", "lot_size", "distance_to_city_center", "school_rating", "price", "price_per_sqft"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const PAGE_SIZE = 10;

export interface MarketQuery {
  filters: Filters;
  sortBy: SortKey;
  dir: "asc" | "desc";
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseQuery(raw: RawParams): MarketQuery {
  const filters: Filters = {};
  for (const key of FILTER_KEYS) {
    const v = first(raw[key]);
    if (v !== undefined && v.trim() !== "" && Number.isFinite(Number(v))) filters[key] = Number(v);
  }
  const sortRaw = first(raw.sortBy);
  const sortBy = (SORT_KEYS as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as SortKey) : "id";
  const dir = first(raw.dir) === "desc" ? "desc" : "asc";
  const pageNum = Number(first(raw.page));
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 0;
  return { filters, sortBy, dir, page };
}

export function filterParams(filters: Filters): URLSearchParams {
  const p = new URLSearchParams();
  for (const key of FILTER_KEYS) if (filters[key] !== undefined) p.set(key, String(filters[key]));
  return p;
}

/** Full URL query for the page (filters + sort + page). Defaults are omitted to keep URLs short. */
export function pageParams(q: MarketQuery): URLSearchParams {
  const p = filterParams(q.filters);
  if (q.sortBy !== "id") p.set("sortBy", q.sortBy);
  if (q.dir !== "asc") p.set("dir", q.dir);
  if (q.page > 0) p.set("page", String(q.page));
  return p;
}

/** Human-readable descriptions of the active filters (chips on screen, header lines in the PDF). */
export function describeFilters(f: Filters): string[] {
  const out: string[] = [];
  const range = (label: string, lo?: number, hi?: number, fmt: (n: number) => string = String) => {
    if (lo !== undefined && hi !== undefined) out.push(`${label}: ${fmt(lo)} – ${fmt(hi)}`);
    else if (lo !== undefined) out.push(`${label}: at least ${fmt(lo)}`);
    else if (hi !== undefined) out.push(`${label}: at most ${fmt(hi)}`);
  };
  range("Price", f.minPrice, f.maxPrice, formatPrice);
  range("Bedrooms", f.minBedrooms, f.maxBedrooms);
  range("Year built", f.minYear, f.maxYear);
  range("Living area (sq ft)", f.minSqft, f.maxSqft, (n) => n.toLocaleString("en-US"));
  return out;
}

export const PRESETS: { label: string; filters: Filters }[] = [
  { label: "All homes", filters: {} },
  { label: "Under $200k", filters: { maxPrice: 200000 } },
  { label: "$200k – $300k", filters: { minPrice: 200000, maxPrice: 300000 } },
  { label: "Over $300k", filters: { minPrice: 300000 } },
  { label: "4+ bedrooms", filters: { minBedrooms: 4 } },
];

export const sameFilters = (a: Filters, b: Filters) =>
  FILTER_KEYS.every((k) => a[k] === b[k]);
