// Explicit "en-US" so server and client render identical text (no hydration mismatches).
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const formatPrice = (v: number) => usd.format(v);
export const formatPricePerSqft = (v: number) => usd2.format(v);
export const formatNumber = (v: number) => num.format(v);

/** "+$6,100" / "-$4,500" — explicit sign so direction never relies on colour alone. */
export function formatSignedPrice(v: number): string {
  const rounded = Math.round(v);
  if (rounded === 0) return usd.format(0);
  return `${rounded > 0 ? "+" : "-"}${usd.format(Math.abs(rounded))}`;
}

export function formatSignedPercent(v: number): string {
  if (v === 0) return "0%";
  return `${v > 0 ? "+" : "-"}${num.format(Math.abs(v))}%`;
}

/** Per-feature display: years never get thousands separators; areas are whole numbers. */
export function formatFeatureValue(key: string, v: number): string {
  if (key === "year_built") return String(Math.round(v));
  if (key === "square_footage" || key === "lot_size") return num.format(Math.round(v));
  return num.format(v);
}
