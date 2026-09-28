import type { FeatureKey, PropertyFeatures } from "./types";

/**
 * Single source of truth for the estimator form: drives both the rendered fields and client-side validation.
 * Limits mirror the backend (App 1 / model API), so the server should rarely be the one to reject input.
 */
export interface FieldSpec {
  key: FeatureKey;
  label: string;
  unit?: string;
  hint: string;
  min: number;
  max: number | (() => number);
  minExclusive?: boolean;
  integer?: boolean;
  example: number;
}

export const FIELDS: FieldSpec[] = [
  { key: "square_footage", label: "Living area", unit: "sq ft", hint: "Interior area, e.g. 1550", min: 200, minExclusive: true, max: 20000, example: 1550 },
  { key: "bedrooms", label: "Bedrooms", hint: "Whole number, 0–20", min: 0, max: 20, integer: true, example: 3 },
  { key: "bathrooms", label: "Bathrooms", hint: "Half baths allowed, e.g. 2.5", min: 0.5, max: 20, example: 2 },
  { key: "year_built", label: "Year built", hint: "e.g. 1997", min: 1800, max: () => new Date().getFullYear() + 1, integer: true, example: 1997 },
  { key: "lot_size", label: "Lot size", unit: "sq ft", hint: "Land area, e.g. 6800", min: 0, minExclusive: true, max: 1_000_000, example: 6800 },
  { key: "distance_to_city_center", label: "Distance to city center", unit: "km", hint: "e.g. 4.1", min: 0, max: 200, example: 4.1 },
  { key: "school_rating", label: "School rating", unit: "/ 10", hint: "0 (worst) to 10 (best)", min: 0, max: 10, example: 7.6 },
];

export type FormValues = Record<FeatureKey, string>;
export type FormErrors = Partial<Record<FeatureKey, string>>;

export const emptyValues = (): FormValues =>
  Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as FormValues;

export const exampleValues = (): FormValues =>
  Object.fromEntries(FIELDS.map((f) => [f.key, String(f.example)])) as FormValues;

const maxOf = (f: FieldSpec) => (typeof f.max === "function" ? f.max() : f.max);
const fmt = (n: number) => n.toLocaleString("en-US");

/** Returns an error message, or null when the raw text is a valid value for this field. */
export function validateField(spec: FieldSpec, raw: string): string | null {
  const text = raw.trim();
  if (text === "") return `${spec.label} is required`;
  // Number() rejects "12abc"; also reject "Infinity"/hex forms by requiring a plain decimal.
  if (!/^-?\d+(\.\d+)?$/.test(text)) return "Enter a number";
  const n = Number(text);
  if (spec.integer && !Number.isInteger(n)) return "Enter a whole number";
  const max = maxOf(spec);
  if (spec.minExclusive ? n <= spec.min : n < spec.min) {
    return spec.minExclusive ? `Must be greater than ${fmt(spec.min)}` : `Must be at least ${fmt(spec.min)}`;
  }
  if (n > max) return `Must be at most ${fmt(max)}`;
  return null;
}

export function validateAll(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  for (const f of FIELDS) {
    const msg = validateField(f, values[f.key]);
    if (msg) errors[f.key] = msg;
  }
  return errors;
}

/** Only call after validateAll() returned no errors. */
export function toFeatures(values: FormValues): PropertyFeatures {
  return Object.fromEntries(FIELDS.map((f) => [f.key, Number(values[f.key])])) as unknown as PropertyFeatures;
}
