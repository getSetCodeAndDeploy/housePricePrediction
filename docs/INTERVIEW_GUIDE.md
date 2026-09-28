# Interview guide

How to use this: read section 1 the night before, skim section 2 an hour before, and practise saying the answers in section 3 out loud. Section 4 is the honest list of limitations; volunteering them is stronger than being caught on them.

## 1. The 60-second pitch

"I built the model API first: FastAPI and scikit-learn, Ridge regression chosen by repeated cross-validation, with batch prediction, model info, health and proper validation, all in a Docker image. Then the portal: a Next.js App Router app with two apps behind one shell. App 1 is a property valuation tool with a Python backend that stores history and explains each estimate. App 2 is a market analysis dashboard with a Java 21 Spring Boot backend that does the aggregate statistics, caching, exports and what-if analysis. Both backends call the same model container, so there is one source of truth for predictions."

## 2. "Why I chose X" cheat sheet

| Decision | Why | Trade-off you should admit |
|---|---|---|
| **Ridge, not plain OLS** | 50 rows and features correlated above 0.9. Ridge shrinks and stabilises coefficients. Compared with OLS using repeated 5-fold CV x10. | Best unconstrained Ridge (alpha 0.3) has CV RMSE about $9.6k vs $10.0k for my pick, i.e. about 4% better on paper. |
| **Positive-constrained coefficients** | The unconstrained fit gave some features negative weights, so the what-if tool said "bigger house, lower price". The constraint keeps the model explainable. | It is a modelling judgement, not a statistical necessity. I documented it and can show the comparison table. |
| **Pipeline(StandardScaler, Ridge)** | Scaling is learned only from training folds (no leakage) and applied automatically at prediction time. | None worth mentioning. |
| **CV instead of one train/test split** | With 50 rows a single 80/20 split would be very noisy. | Coefficient signs are still not causal: `distance_to_city_center` has a positive weight, which is a data quirk. |
| **Model behind its own API, called by both backends** | Single source of truth, independent deploys, exactly the brief. | Extra network hop; mitigated with timeouts, health checks and a batch endpoint. |
| **Contribution = coef x (value - mean)** | Raw coef x value plus a large negative intercept is meaningless. Effect vs. an average home is readable, and baseline + effects equals the prediction exactly. | Only valid because the model is linear. |
| **SQLite for App 1 history** | Zero infrastructure, stdlib, enough for a demo. Docker volume keeps it across restarts. | Not for concurrent multi-instance production; swap `HistoryStore` for Postgres. |
| **Spring Boot + records + Bean Validation** | Idiomatic Java 21: immutable DTOs, declarative validation, one `@RestControllerAdvice` for the error shape. | - |
| **Caffeine cache, 10 min TTL, 500 entries** | Dataset is static and the model deterministic, so identical filters give identical results. | Would use Redis for multiple instances; would invalidate on data change. |
| **Next.js Server Components for initial data** | First paint has data, less client JS, no loading waterfalls. | Client components still needed for forms, charts, tabs. |
| **URL as state on the market page** | Shareable, reload-safe, back button works, server computes the view. | More plumbing than `useState`; needed a `parseQuery` layer and validation. |
| **`useTransition` "keep the frame"** | Old view stays (dimmed, `aria-busy`) instead of flashing a skeleton on every filter change. | - |
| **BFF proxy route handler** | No CORS, hides internal hostnames, only `/api/*` forwarded. | One more hop; fine for this scale. |
| **Zustand created per provider** | Module-level stores leak state between requests during SSR. | Slightly more boilerplate than a global store. |
| **Zustand vs Redux/Context** | Small, hook-based, no provider re-render storms. State is small (selected rows, last result). | For a large team with strict conventions, Redux Toolkit is also fine. |
| **Hand-drawn SVG charts** | Small bundle, full control over accessibility and theming. | More code than Recharts; I would use a library for many chart types. |
| **jsPDF, dynamic import** | Client-side export needs no server, and the library only loads on click. | Layout is table-based; server-side rendering would give richer PDFs. |
| **Tailwind v4 with semantic tokens** | Dark mode and contrast are handled in one place, components never use raw colours. | - |

## 3. Likely questions and good answers

**Model**

*Why is R2 so high, is it overfitting?* The data is small and very clean (features strongly correlated with price), so a linear model fits well. I report cross-validated R2 (about 0.98) rather than training R2 (0.982), and they are close. With 50 rows I would still not promise that on unseen data from a different market.

*Why not a random forest or gradient boosting?* With 50 rows and near-linear structure they add variance, not accuracy, and they break monotonic what-if behaviour. I would revisit with more data.

*What is multicollinearity and how did you handle it?* Features move together, so the model cannot separate their individual effects. Ridge stabilises the coefficients, and the UI says plainly that predictions are more reliable than individual coefficients.

*What happens when a user asks for a 5,000 sq ft house?* The model API returns a prediction with an extrapolation warning, because the training range is 980 to 2,400 sq ft. The UI surfaces that warning.

*How would you retrain and deploy a new model?* Run `scripts/train.py`, which writes `model.joblib` and `model_info.json`; rebuild the image. In production I would version artefacts, add a model registry and a canary, and expose the version in `/model-info`.

**Backend**

*How do the services fail when the model is down?* Backends use timeouts and translate connection failures into a clear 502/503 with a message; the portal shows an inline error with Retry, and the footer bar shows per-service health.

*Why does App 1 not just import the model?* The brief wants both apps to use the model container, and it keeps one source of truth and lets the model scale independently.

*How would you scale the Java service?* It is stateless except the cache, so run several replicas; move the cache to Redis if consistency across replicas matters.

*How do you test?* Model API (7 tests), App 1 (12 tests with a fake model over `httpx.MockTransport`), Java unit and integration tests with `@MockitoBean` for the model client (written, not run in my sandbox), and Playwright end-to-end checks for both UIs.

**Frontend**

*Why App Router and Server Components?* Data-heavy pages benefit from fetching on the server; interactive pieces stay client components. Loading and error boundaries are per route.

*How do you avoid unnecessary re-renders?* Filter state lives in the URL, not a global store; the estimator store is small and consumed by selector; heavy libraries are dynamically imported.

*Explain your accessibility approach.* Semantic HTML first (real buttons, tables with captions, `aria-sort`), labelled fields with `aria-describedby`/`aria-invalid`, focus moves to the first invalid field, skip link, ARIA tabs with roving tabindex, charts have keyboard tooltips and a data-table alternative, colour is never the only signal, `prefers-reduced-motion` respected. Verified with axe-core (0 violations, light and dark), plus keyboard-only runs.

*How is state managed?* Server state: fetched in Server Components or through small hooks that return `{ok, data} | {ok:false, error}`. UI state: local `useState` or the Zustand store. Shareable state: URL params.

*Why not React Query or SWR?* The needs are simple (a few fetches, no polling). I would add TanStack Query if I needed background refetching, optimistic updates or a shared cache across many components.

**Process**

*What would you do with more time?* Real auth, Postgres, OpenAPI-generated TypeScript types shared with the backends, contract tests between portal and each backend, CI running all tests and e2e, and Playwright visual regression.

*What was the hardest part?* Making the what-if analysis trustworthy on a tiny, collinear dataset: that is where the positive constraint and the extrapolation warnings came from.

## 4. Honest limitations (say them before you are asked)

1. **Java backend not compiled in my build environment.** Maven Central was unreachable there, so I verified it by syntax check, a stubbed run of the statistics logic and a Python mock of the API. **Run `mvn test` and `docker compose up --build` on your machine before the interview and fix anything that turns up.**
2. **Docker images were not built** in my build environment for the same reason.
3. **Only 50 rows**, so all accuracy claims come with wide uncertainty.
4. **No authentication or multi-user separation** of App 1 history.
5. **Linear model**, so what-if price curves are straight lines by construction.

## 5. Pre-interview checklist

- [ ] `docker compose up --build` works from a clean clone
- [ ] `cd app2-backend && mvn test` passes
- [ ] Model Swagger at :8000/docs shows all endpoints
- [ ] Run `python portal/e2e/estimator_flow.py`, `market_flow.py`, `market_a11y.py` against the real stack
- [ ] Repo pushed, README renders, Swagger link works in your live demo
- [ ] Rehearse `docs/DEMO_SCRIPT.md` twice, out loud, with a timer
