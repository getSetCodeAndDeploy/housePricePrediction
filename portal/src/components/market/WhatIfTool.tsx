"use client";

import { useState, type FormEvent } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import LineChart from "@/components/charts/LineChart";
import { compactPrice } from "@/components/charts/scale";
import { ApiError, app2, fetchJson } from "@/lib/api";
import { formatFeatureValue, formatPrice, formatSignedPercent, formatSignedPrice } from "@/lib/format";
import type { FeatureKey, FeatureRange, SweepResult, WhatIfResult } from "@/lib/types";
import { FIELDS, exampleValues, toFeatures, validateAll, type FormErrors, type FormValues } from "@/lib/validation";

const inputCls = "h-9 w-full rounded-md border bg-surface px-2 text-sm";
const label = (k: FeatureKey) => FIELDS.find((f) => f.key === k)!.label;

/**
 * "What if?" tool. Left column = the property as it is; right column = the scenario (starts identical).
 * Only the fields you change are sent as `changes`; the backend predicts both in one model call and returns the
 * difference. Below, a price curve shows how the estimate moves as ONE feature varies across its observed range.
 */
export default function WhatIfTool({ ranges }: { ranges: FeatureRange[] }) {
  const [base, setBase] = useState<FormValues>(exampleValues);
  const [scenario, setScenario] = useState<FormValues>(exampleValues);
  const [errors, setErrors] = useState<{ base: FormErrors; scenario: FormErrors }>({ base: {}, scenario: {} });
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const changedKeys = FIELDS.filter((f) => scenario[f.key].trim() !== base[f.key].trim()).map((f) => f.key);

  function setBaseValue(key: FeatureKey, v: string, syncScenario: boolean) {
    setBase((b) => ({ ...b, [key]: v }));
    // Until the user edits the scenario for this field, keep it mirroring the current property.
    if (syncScenario) setScenario((s) => ({ ...s, [key]: v }));
    setErrors((e) => ({ ...e, base: { ...e.base, [key]: undefined } }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);
    setNotice(null);
    const eb = validateAll(base);
    const es = validateAll(scenario);
    setErrors({ base: eb, scenario: es });
    if (Object.keys(eb).length || Object.keys(es).length) return;
    const b = toFeatures(base);
    const s = toFeatures(scenario);
    const changes = Object.fromEntries(FIELDS.filter((f) => b[f.key] !== s[f.key]).map((f) => [f.key, s[f.key]]));
    if (Object.keys(changes).length === 0) {
      setResult(null);
      return setNotice("Change at least one value in the Scenario column to compare.");
    }
    setBusy(true);
    try {
      setResult(await fetchJson<WhatIfResult>(app2("/api/what-if"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ base: b, changes }) }));
    } catch (err) {
      setResult(null);
      setApiError(err instanceof ApiError ? err : new ApiError("Something went wrong. Please try again.", 500));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="What-if analysis" description="Change one or more details and see how the model's estimate responds." />
        <CardBody>
          <form onSubmit={onSubmit} noValidate>
            <div className="grid grid-cols-[1fr_1fr_1fr] items-end gap-x-3 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,1.2fr)_1fr_1fr]">
              <span className="font-medium text-muted">Feature</span>
              <span className="font-medium">Current property</span>
              <span className="font-medium">Scenario</span>
              {FIELDS.map((f) => {
                const changed = changedKeys.includes(f.key);
                return (
                  <Row key={f.key}>
                    <label htmlFor={`wi-base-${f.key}`} className="self-center text-muted">
                      {f.label}
                      {f.unit && <span className="ml-1 text-xs">({f.unit})</span>}
                    </label>
                    <Cell
                      id={`wi-base-${f.key}`}
                      label={`${f.label}, current property`}
                      value={base[f.key]}
                      error={errors.base[f.key]}
                      onChange={(v) => setBaseValue(f.key, v, !changed)}
                    />
                    <Cell
                      id={`wi-scen-${f.key}`}
                      label={`${f.label}, scenario`}
                      value={scenario[f.key]}
                      error={errors.scenario[f.key]}
                      changed={changed}
                      onChange={(v) => {
                        setScenario((s) => ({ ...s, [f.key]: v }));
                        setErrors((e) => ({ ...e, scenario: { ...e.scenario, [f.key]: undefined } }));
                      }}
                    />
                  </Row>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" loading={busy}>
                {busy ? "Comparing…" : "Compare scenario"}
              </Button>
              <Button variant="ghost" onClick={() => setScenario(base)} disabled={changedKeys.length === 0}>
                Reset scenario
              </Button>
              <span className="text-sm text-muted" role="status">
                {changedKeys.length === 0 ? "No changes yet" : `${changedKeys.length} ${changedKeys.length === 1 ? "change" : "changes"}: ${changedKeys.map(label).join(", ")}`}
              </span>
            </div>
          </form>

          <div className="mt-4 space-y-3" aria-live="polite">
            {notice && <Alert tone="warning">{notice}</Alert>}
            {apiError && (
              <Alert tone="error" title="Could not run the scenario">
                {apiError.message}
              </Alert>
            )}
            {result && <ScenarioResult result={result} />}
          </div>
        </CardBody>
      </Card>

      <PriceCurve ranges={ranges} base={base} scenario={scenario} setErrors={(e) => setErrors((prev) => ({ ...prev, base: e }))} />
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="contents">{children}</div>;
}

function Cell({ id, label: aria, value, error, changed, onChange }: { id: string; label: string; value: string; error?: string; changed?: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <input
        id={id}
        aria-label={aria}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} ${error ? "border-danger" : changed ? "border-brand bg-brand-soft" : "border-line"}`}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function ScenarioResult({ result }: { result: WhatIfResult }) {
  const changes = FIELDS.filter((f) => result.baseline[f.key] !== result.scenario[f.key]);
  const up = result.delta >= 0;
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Current estimate</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight" data-testid="wi-baseline">{formatPrice(result.baseline_price)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Scenario estimate</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight" data-testid="wi-scenario">{formatPrice(result.scenario_price)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Difference</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight" data-testid="wi-delta">
            <span aria-hidden="true" className={`mr-2 inline-block size-2.5 rounded-full ${up ? "bg-chart-pos" : "bg-chart-neg"}`} />
            {formatSignedPrice(result.delta)} <span className="text-base font-medium text-muted">({formatSignedPercent(result.delta_pct)})</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-muted">
        {changes.map((f) => `${f.label}: ${formatFeatureValue(f.key, result.baseline[f.key])} → ${formatFeatureValue(f.key, result.scenario[f.key])}`).join("; ")}.{" "}
        {up ? "This raises" : "This lowers"} the estimate.
      </p>
      {result.warnings.length > 0 && (
        <div className="mt-3">
          <Alert tone="warning" title="Outside the range the model was trained on">
            {result.warnings.join(". ")}. Treat this scenario as an extrapolation.
          </Alert>
        </div>
      )}
    </div>
  );
}

function PriceCurve({ ranges, base, scenario, setErrors }: { ranges: FeatureRange[]; base: FormValues; scenario: FormValues; setErrors: (e: FormErrors) => void }) {
  const [feature, setFeature] = useState<FeatureKey>("square_footage");
  const [curve, setCurve] = useState<SweepResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const range = ranges.find((r) => r.feature === feature);
  const spec = FIELDS.find((f) => f.key === feature)!;

  async function plot() {
    setError(null);
    const eb = validateAll(base);
    setErrors(eb);
    if (Object.keys(eb).length) return setError("Fix the highlighted values in “Current property” first.");
    if (!range) return setError("No range available for this feature.");
    setBusy(true);
    try {
      setCurve(await fetchJson<SweepResult>(app2("/api/what-if/sweep"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ base: toFeatures(base), feature, from: range.min, to: range.max, steps: 20 }) }));
    } catch (err) {
      setCurve(null);
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Marker positions: read the curve at the current / scenario value of the chosen feature (if inside the plotted range).
  const at = (x: number) => {
    const pts = curve?.points ?? [];
    if (pts.length < 2 || x < pts[0].value || x > pts[pts.length - 1].value) return null;
    const i = Math.max(1, pts.findIndex((p) => p.value >= x));
    const [a, b] = [pts[i - 1], pts[i]];
    return a.predicted_price + ((x - a.value) / (b.value - a.value || 1)) * (b.predicted_price - a.predicted_price);
  };
  const markers = [];
  if (curve && curve.feature === feature) {
    const bx = Number(base[feature]);
    const sx = Number(scenario[feature]);
    const by = at(bx);
    if (by !== null) markers.push({ x: bx, y: by, label: "Current" });
    const sy = at(sx);
    if (sy !== null && sx !== bx) markers.push({ x: sx, y: sy, label: "Scenario" });
  }
  const xFmt = (v: number) => formatFeatureValue(feature, v);

  return (
    <Card>
      <CardHeader title="Price curve" description="How the estimate moves as one feature changes across the range seen in the data, everything else held at the current property." />
      <CardBody>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="curve-feature" className="mb-1 block text-sm font-medium">
              Feature to vary
            </label>
            <select
              id="curve-feature"
              value={feature}
              onChange={(e) => {
                setFeature(e.target.value as FeatureKey);
                setCurve(null);
              }}
              className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
            >
              {FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <p className="pb-2 text-sm text-muted">
            {range ? `From ${xFmt(range.min)} to ${xFmt(range.max)}${spec.unit ? ` ${spec.unit}` : ""}` : ""}
          </p>
          <Button onClick={plot} loading={busy}>
            {busy ? "Plotting…" : "Plot price curve"}
          </Button>
        </div>

        <div aria-live="polite" className="mt-4">
          {error && <Alert tone="error">{error}</Alert>}
        </div>

        {curve && curve.feature === feature && (
          <div className="mt-2" data-testid="price-curve">
            <LineChart
              ariaLabel={`Estimated price as ${spec.label.toLowerCase()} varies`}
              points={curve.points.map((p) => ({ x: p.value, y: p.predicted_price }))}
              markers={markers}
              xFormat={xFmt}
              yFormat={compactPrice}
              xLabel={`${spec.label}${spec.unit ? ` (${spec.unit})` : ""}`}
            />
            <p className="mt-2 text-sm text-muted">
              The model is linear, so each feature moves the price along a straight line; the slope is that feature&apos;s effect per unit.
            </p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-muted hover:text-fg">Show data table</summary>
              <div className="mt-2 max-h-64 overflow-auto" role="region" aria-label="Price curve data" tabIndex={0}>
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">Estimated price for each value of {spec.label}</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th scope="col" className="py-1.5 pr-3 font-medium">{spec.label}</th>
                      <th scope="col" className="py-1.5 text-right font-medium">Estimated price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curve.points.map((p) => (
                      <tr key={p.value} className="border-b border-line">
                        <td className="py-1.5 pr-3">{xFmt(p.value)}</td>
                        <td className="py-1.5 text-right">{formatPrice(p.predicted_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
