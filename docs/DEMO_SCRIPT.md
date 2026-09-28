# Demo script (about 10 minutes)

Before you start: `docker compose up --build`, wait for all four services to be healthy, open http://localhost:3000 and http://localhost:8000/docs in two tabs. Clear the history first if it has old entries. Have your GitHub repo open in a third tab.

## 0. Frame it (30 s)
"Two tasks. Task 1 is a model API. Task 2 is one portal with two apps that both use that same model container: a Python backend for property valuation, and a Java backend for market analysis."

## 1. Task 1 - the model API (2 min) - tab :8000/docs
1. **GET /health** -> healthy, model loaded.
2. **GET /model-info** -> "Ridge, alpha 0.1, positive-constrained. Cross-validated R2 about 0.98, RMSE about $10k. I compared plain linear regression with Ridge using repeated 5-fold CV because there are only 50 rows."
3. **POST /predict** with the single-property example -> price. Then send the batch body (`instances: [...]`) from the test CSV -> list of prices.
4. Send a bad body (e.g. `bedrooms: -1`) -> 422 with per-field errors.
5. Send `square_footage: 5000` -> prediction plus an extrapolation warning.

## 2. App 1 - Property Value Estimator (3 min) - /estimator
1. Submit the empty form -> errors on all fields, focus jumps to the first invalid one.
2. Fill the example, submit -> price, and the breakdown chart: "each bar is that feature's effect versus an average home; baseline plus bars equals the prediction exactly."
3. Add a second property with a label -> history table (persisted in SQLite, survives restart).
4. Tick two rows -> Compare -> differences per feature and in price.
5. Mention: Zustand store, custom hooks (`useEstimateForm`, `useEstimates`), server-loaded history.

## 3. App 2 - Market Analysis (4 min) - /market
1. Overview: tiles, histogram, price by bedrooms/decade, correlations. Point at the note "Why the bars look alike" (multicollinearity).
2. Click **4+ bedrooms** -> URL changes, view dims while it refreshes, stats and table update. Copy the URL to show it is shareable; reload to show it persists.
3. Type a price range with min > max -> inline validation. Fix it and apply -> filter chips.
4. Sort by Price (header button, `aria-sort`), page through with Next.
5. **Export CSV** and **Export PDF** -> open the PDF: filters line, summary, all rows, page numbers.
6. **What-if tab:** increase living area -> current vs. scenario price, delta and %. Push it to 5000 sq ft -> extrapolation warning. **Plot price curve** -> hover or use arrow keys.
7. Mention: Java 21 records, Caffeine cache (hit/miss on repeated filters), one batch call to the model per what-if.

## 4. Quality and accessibility (1 min)
- Keyboard-only: Tab through the filter bar, use arrow keys in tabs and on the chart.
- Toggle dark mode (OS setting) -> both themes are token-driven.
- Resize to phone width -> no horizontal scroll.
- "axe-core WCAG 2.1 AA scan: zero violations in every state."

## If something goes wrong
- **A service shows "down" in the footer bar:** say so calmly, it is the health bar working. `docker compose logs <service>`.
- **Java service fails to build on the interview machine:** most likely Maven Central TLS/network flakiness, not a code issue - `app2-backend/settings.xml` mirrors Maven Central via Google's mirror for exactly this. If it still won't build, fall back to `app2-backend/dev-mock` and say so.
- **Slow first request:** the model container imports scikit-learn on start; the compose healthcheck waits for it.
