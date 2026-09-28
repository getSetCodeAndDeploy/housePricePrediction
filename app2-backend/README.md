# App 2 backend - Property Market Analysis (Java 21, Spring Boot 3.4.4)

Serves aggregate statistics from the bundled housing dataset and what-if analysis via the Task 1 model container.

```bash
mvn spring-boot:run                      # http://localhost:8002 , Swagger UI at /swagger-ui.html
MODEL_API_URL=http://localhost:8000 mvn spring-boot:run
mvn test
```

| Endpoint | Purpose |
|---|---|
| `GET /api/market/stats?minPrice&maxPrice&minBedrooms&maxBedrooms&minYear&maxYear&minSqft&maxSqft&bins=8` | Summary, by-bedroom, by-decade, price histogram, price correlations (**cached**) |
| `GET /api/houses?...filters&sortBy=price&dir=desc&page=0&size=20` | Sortable / filterable / paged table |
| `GET /api/houses/export.csv?...filters` | CSV export of the filtered segment |
| `GET /api/meta/features` | Min/max per feature (for sliders) |
| `POST /api/what-if` | `{base, changes}` -> baseline vs scenario price, delta, delta % (**cached**) |
| `POST /api/what-if/sweep` | `{base, feature, from, to, steps}` -> price curve for one feature (**cached**) |
| `GET /api/cache/stats` | Caffeine hit/miss counters |
| `GET /actuator/health` | Health |

Design notes
- JSON is snake_case (`square_footage`), matching the model API and App 1; query params are camelCase.
- Caffeine caches (10 min TTL, 500 entries) for stats, what-if and sweep; `/api/cache/stats` proves hits.
- What-if and sweep send ONE batch request to the model (baseline + scenario together; a whole sweep at once).
- Scenarios are validated before calling the model, so bad input never costs a network call.
- Model failures map to 503 (unreachable/timeout), 502 (bad upstream), 422 (rejected input).
- PDF export is generated in the frontend; the backend provides CSV.
