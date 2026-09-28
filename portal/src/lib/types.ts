/** Contract types shared by both apps (JSON is snake_case end to end). */

export interface PropertyFeatures {
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
}

export type FeatureKey = keyof PropertyFeatures;

export interface ServiceStatus {
  name: string;
  label: string;
  ok: boolean;
  detail?: string;
}

export interface StatusResponse {
  checked_at: string;
  services: ServiceStatus[];
}

/* ---------- App 1 (estimator backend) ---------- */

export interface Contribution {
  feature: FeatureKey;
  value: number;
  average: number;
  /** Price effect vs. an average home: coefficient x (value - average). */
  contribution: number;
}

export interface Estimate {
  id: number;
  created_at: string;
  label: string | null;
  features: PropertyFeatures;
  predicted_price: number;
  price_per_sqft: number;
  warnings: string[];
  /** Predicted price of an average home; baseline_price + sum(contributions) == predicted_price. */
  baseline_price: number;
  contributions: Contribution[];
}

export interface EstimatesPage {
  total: number;
  items: Estimate[];
}

export interface CompareRow {
  label: string;
  features: PropertyFeatures;
  predicted_price: number;
  price_per_sqft: number;
  diff_vs_first: number;
  diff_vs_first_pct: number;
}

export interface CompareResponse {
  rows: CompareRow[];
  best_value_label: string;
}

/* ---------- App 2 (market analysis backend) ---------- */

export interface MarketSummary {
  count: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  std_dev_price: number;
  avg_price_per_sqft: number;
  avg_square_footage: number;
}

export interface GroupStat {
  key: string;
  count: number;
  avg_price: number;
  avg_price_per_sqft: number;
}

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface Correlation {
  feature: FeatureKey;
  r: number;
}

export interface MarketStats {
  summary: MarketSummary;
  by_bedrooms: GroupStat[];
  by_decade_built: GroupStat[];
  price_histogram: HistogramBin[];
  price_correlations: Correlation[];
}

export interface HouseRow extends PropertyFeatures {
  id: number;
  price: number;
  price_per_sqft: number;
}

export interface HousesPage {
  items: HouseRow[];
  total: number;
  page: number;
  size: number;
}

export interface FeatureRange {
  feature: FeatureKey;
  min: number;
  max: number;
}

export interface WhatIfResult {
  baseline: PropertyFeatures;
  scenario: PropertyFeatures;
  baseline_price: number;
  scenario_price: number;
  delta: number;
  delta_pct: number;
  warnings: string[];
}

export interface SweepPoint {
  value: number;
  predicted_price: number;
}

export interface SweepResult {
  feature: FeatureKey;
  points: SweepPoint[];
}
