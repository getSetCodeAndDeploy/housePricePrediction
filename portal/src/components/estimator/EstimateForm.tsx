"use client";

import { useState, type FormEvent } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useEstimateForm } from "@/hooks/useEstimateForm";
import { useEstimates } from "@/hooks/useEstimates";
import { FIELDS } from "@/lib/validation";

export default function EstimateForm() {
  const form = useEstimateForm();
  const { busy, error, clearError, create } = useEstimates();
  const [label, setLabel] = useState("");
  const [summary, setSummary] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const features = form.validateForSubmit();
    if (!features) {
      setSummary("Please fix the highlighted fields and try again.");
      return;
    }
    setSummary(null);
    const result = await create(features, label);
    if (result.ok) {
      setLabel("");
    } else if (result.error.errors?.length) {
      // Server rejected specific fields (should be rare: we validate the same rules client-side).
      form.applyServerErrors(result.error.errors);
    }
  }

  // If the server rejected specific fields, show them inline (once) instead of a generic banner.
  const serverFieldErrors = error?.errors ?? [];
  const showBanner = error && serverFieldErrors.length === 0;

  return (
    <Card>
      <CardHeader title="Property details" description="All fields are required except the name." />
      <CardBody>
        <form onSubmit={onSubmit} noValidate aria-describedby={summary ? "form-summary" : undefined}>
          {summary && (
            <div id="form-summary" className="mb-4">
              <Alert tone="error">{summary}</Alert>
            </div>
          )}
          {showBanner && (
            <div className="mb-4">
              <Alert tone="error" title="Could not get an estimate">
                {error.message}
              </Alert>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="field-label"
              label="Name (optional)"
              hint="Helps you recognise it in history"
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Maple St house"
              className="sm:col-span-2"
            />
            {FIELDS.map((f) => (
              <Field
                key={f.key}
                id={`field-${f.key}`}
                label={f.label}
                suffix={f.unit}
                hint={f.hint}
                error={form.errors[f.key]}
                inputMode={f.integer ? "numeric" : "decimal"}
                autoComplete="off"
                required
                aria-required="true"
                value={form.values[f.key]}
                onChange={(e) => form.setValue(f.key, e.target.value)}
                onBlur={() => form.blur(f.key)}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="submit" loading={busy === "creating"}>
              {busy === "creating" ? "Estimating…" : "Estimate price"}
            </Button>
            <Button variant="secondary" onClick={form.fillExample} disabled={busy === "creating"}>
              Use example
            </Button>
            <Button variant="ghost" onClick={form.reset} disabled={busy === "creating"}>
              Reset
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
