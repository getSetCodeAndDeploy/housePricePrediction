# Housing Price Portal

| Folder | What | Stack | Port |
|---|---|---|---|
| `model-api/` | **Task 1** - price prediction model API | Python 3.12, FastAPI, scikit-learn | 8000 |
| `app1-backend/` | App 1 backend - Property Value Estimator | Python 3.12, FastAPI | 8001 |
| `app2-backend/` | App 2 backend - Market Analysis | Java 21, Spring Boot 3.4.4 | 8002 |
| `portal/` | **Task 2** - unified portal (both apps' UI) | Next.js App Router, Tailwind | 3000 |

## Docs
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - diagrams (Mermaid, plus PNG copies in `docs/`), request flows, key decisions
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) - 10-minute walkthrough
- [`docs/INTERVIEW_GUIDE.md`](docs/INTERVIEW_GUIDE.md) - "why I chose X", likely questions, honest limitations

## Architecture
```
Browser -> portal (Next.js :3000) --+--> app1-backend (FastAPI :8001) --+
                                    |                                   +--> model-api (:8000)
                                    +--> app2-backend (Spring :8002) ---+
```
Each backend owns its domain logic (history/validation vs. aggregates/caching/what-if) and calls the
same model container over HTTP, so the model is a single source of truth.

## Run everything
```bash
docker compose up --build
# portal:  http://localhost:3000     model Swagger: http://localhost:8000/docs
```
Task 1 on its own: see `model-api/README.md`.

## Status
- [x] Model + prediction API + Dockerfile
- [x] Repo skeleton + Docker Compose wiring for all four services
- [x] App 1 backend (Python)
- [x] App 2 backend (Java) - `mvn test` passes (16/16) against the real model container
- [x] Portal shell (layout, design system, error/loading boundaries, API proxy, status bar)
- [x] Estimator UI (form + validation, result table + chart, history, comparison)
- [x] Market Analysis UI (filters, stats, charts, sortable table, CSV/PDF export, what-if + price curve)
- [x] Docs (architecture, demo script, interview guide), full stack verified end-to-end

## Portal conventions
- **Browser -> portal only.** Client code calls `/api/app1/*` and `/api/app2/*` (a Next.js route-handler proxy to the backends): no CORS, internal service names stay private, only `/api/*` paths are forwarded.
- **Server Components fetch initial data**; expected failures (backend down) render an inline `Alert` with a Retry button, unexpected ones fall to the route's `error.tsx`. Each route has its own `loading.tsx` skeleton.
- **Design tokens** live in `portal/src/app/globals.css` (semantic colours + automatic dark mode); UI primitives are in `portal/src/components/ui/`.
- **Accessibility:** skip link, visible focus ring, `aria-current` nav, labelled form fields with linked errors, `prefers-reduced-motion` respected. Automated axe-core scan (WCAG 2.1 A/AA): 0 violations on all pages, light and dark.

## Estimator UI
- **Data flow:** `estimator/page.tsx` (Server Component) loads history from App 1 on the server and passes it to the client `EstimatorWorkspace`. Mutations go browser -> `/api/app1/*` proxy -> App 1 -> model API.
- **State:** a Zustand store created *per provider* (a module-level store would leak data between visitors during SSR). The store is updated only from confirmed server responses. Form state and validation live in `useEstimateForm`; API calls in `useEstimates`.
- **Validation:** `lib/validation.ts` is the single source for the form fields and their rules (mirroring the backend limits). Errors show on blur, then update live; a failed submit focuses the first invalid field; server 422 field errors map back onto inputs.
- **"Why this price":** App 1 returns each feature's effect *vs. an average home* (`coefficient x (value - mean)`) plus `baseline_price`, so `baseline + effects == estimate` exactly. Charted as diverging bars (blue raises / red lowers; sign is also written out, never colour alone) with the same numbers in a table.
- **Charts:** hand-built, responsive HTML bars following the dataviz skill's mark specs; colours validated for colour-blind separation and contrast in light and dark.
- **Tests:** `portal/e2e/estimator_flow.py` (17 checks: validation, estimate, history, compare, delete, warnings) and `portal/e2e/a11y_scan.py` (axe-core, all states, light + dark).

## Market Analysis UI

- **URL is the state.** Filters, sort and page live in the search params. `app/market/page.tsx` is a Server Component: it parses them (`lib/market-query.ts`), fetches stats + the current page + feature ranges in parallel, and passes plain data down. Links are shareable and survive reload.
- **Keep the frame.** `MarketShell` wraps navigation in `useTransition`: the old view stays on screen (full contrast, `aria-busy` + a small "Updating..." badge) until the new data arrives - no skeleton flash, and no contrast drop for axe to catch.
- **Server-side sorting/paging** (`aria-sort` header buttons) so it scales beyond 50 rows; the backend caches stats per filter (Caffeine, 10 min).
- **Charts** are hand-drawn SVG (no chart library): histogram, average price by bedrooms/decade, correlations. Every chart has a "Show data table" alternative and keyboard-reachable tooltips.
- **Export.** CSV is a plain download link to the Java backend; PDF is built in the browser with jsPDF (dynamically imported, so it costs nothing until clicked) from all filtered rows.
- **What-if.** Current vs. scenario columns; only changed fields are sent; one backend call predicts both. The price curve sweeps one feature over its observed range. Out-of-range inputs show an extrapolation warning.

Testing: `python e2e/market_flow.py` (17 checks) and `python e2e/market_a11y.py` (axe WCAG 2.1 A/AA, light + dark, both tabs, mobile overflow).

> **Verified end-to-end against the real stack** (Docker Compose, real Java backend, no mocks): `docker compose build && up` succeeds for all four services, `mvn test` passes 16/16, and both `market_flow.py` (17/17) and `market_a11y.py` (0 violations, light + dark + mobile) pass against the running containers. This surfaced and fixed two real bugs along the way: a `RestClient` request-factory bug that sent empty POST bodies to the model API (see `app2-backend/.../config/AppConfig.java`), and a loading-state opacity fade that dropped text contrast below WCAG AA (see `portal/src/components/market/MarketShell.tsx`).
