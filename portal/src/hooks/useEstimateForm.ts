"use client";

import { useCallback, useRef, useState } from "react";
import type { FeatureKey, PropertyFeatures } from "@/lib/types";
import type { FieldIssue } from "@/lib/api";
import {
  FIELDS,
  emptyValues,
  exampleValues,
  toFeatures,
  validateAll,
  validateField,
  type FormErrors,
  type FormValues,
} from "@/lib/validation";

/**
 * Form state + validation for the estimator.
 * - Errors appear after a field is blurred (or on submit), and then update live as the user fixes them.
 * - On a failed submit, focus moves to the first invalid field (keyboard / screen-reader friendly).
 * - Server-side (422) field errors can be mapped back onto the same fields.
 */
export function useEstimateForm() {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  // Which fields the user has already left; a ref because changing it needs no re-render by itself.
  const touched = useRef<Set<FeatureKey>>(new Set());

  const setValue = useCallback((key: FeatureKey, raw: string) => {
    setValues((v) => ({ ...v, [key]: raw }));
    if (touched.current.has(key)) {
      const spec = FIELDS.find((f) => f.key === key)!;
      setErrors((e) => ({ ...e, [key]: validateField(spec, raw) ?? undefined }));
    }
  }, []);

  const blur = useCallback(
    (key: FeatureKey) => {
      touched.current.add(key);
      const spec = FIELDS.find((f) => f.key === key)!;
      const msg = validateField(spec, values[key]);
      setErrors((e) => ({ ...e, [key]: msg ?? undefined }));
    },
    [values],
  );

  /** Returns the parsed features when valid; otherwise shows all errors, focuses the first one, returns null. */
  const validateForSubmit = useCallback((): PropertyFeatures | null => {
    const found = validateAll(values);
    FIELDS.forEach((f) => touched.current.add(f.key));
    setErrors(found);
    const first = FIELDS.find((f) => found[f.key]);
    if (first) {
      document.getElementById(`field-${first.key}`)?.focus();
      return null;
    }
    return toFeatures(values);
  }, [values]);

  const applyServerErrors = useCallback((issues: FieldIssue[]) => {
    const next: FormErrors = {};
    for (const i of issues) {
      const spec = FIELDS.find((f) => f.key === i.field);
      if (spec) next[spec.key] = i.message;
    }
    setErrors((e) => ({ ...e, ...next }));
    const first = FIELDS.find((f) => next[f.key]);
    if (first) document.getElementById(`field-${first.key}`)?.focus();
    return Object.keys(next).length > 0;
  }, []);

  const reset = useCallback(() => {
    setValues(emptyValues());
    setErrors({});
    touched.current.clear();
  }, []);

  const fillExample = useCallback(() => {
    setValues(exampleValues());
    setErrors({});
    touched.current.clear();
  }, []);

  return { values, errors, setValue, blur, validateForSubmit, applyServerErrors, reset, fillExample };
}
