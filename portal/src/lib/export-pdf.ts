import { app2, fetchJson } from "./api";
import { formatFeatureValue, formatPrice, formatPricePerSqft } from "./format";
import { describeFilters, filterParams, type Filters, type MarketQuery } from "./market-query";
import type { HousesPage, MarketStats } from "./types";

/** Every filtered row (paging through the API in chunks of 200). */
async function fetchAllRows(q: MarketQuery) {
  const rows: HousesPage["items"] = [];
  for (let page = 0; page < 10; page++) {
    const p = filterParams(q.filters);
    p.set("sortBy", q.sortBy);
    p.set("dir", q.dir);
    p.set("page", String(page));
    p.set("size", "200");
    const res = await fetchJson<HousesPage>(app2(`/api/houses?${p}`));
    rows.push(...res.items);
    if (rows.length >= res.total) break;
  }
  return rows;
}

/**
 * Builds and downloads a PDF report of the CURRENT filtered segment: filters, headline stats and the full data table.
 * jsPDF is imported on demand, so its ~300 KB stays out of the initial page bundle.
 * Note: jsPDF's built-in font only covers basic Latin, so the text below avoids symbols like >= and arrows.
 */
export async function exportMarketPdf(q: MarketQuery, stats: MarketStats, filtersOverride?: Filters) {
  const rows = await fetchAllRows(filtersOverride ? { ...q, filters: filtersOverride } : q);
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 40;
  const s = stats.summary;

  doc.setFontSize(18);
  doc.text("Housing market report", margin, 46);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`, margin, 62);
  const filters = describeFilters(q.filters);
  doc.text(filters.length ? `Filters: ${filters.join("  |  ")}` : "Filters: none (all homes)", margin, 76);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 90,
    head: [["Homes", "Average price", "Median price", "Lowest", "Highest", "Avg. price / sq ft"]],
    body: [[String(s.count), formatPrice(s.avg_price), formatPrice(s.median_price), formatPrice(s.min_price), formatPrice(s.max_price), formatPricePerSqft(s.avg_price_per_sqft)]],
    theme: "grid",
    styles: { fontSize: 10, halign: "center" },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin },
  });

  autoTable(doc, {
    // @ts-expect-error lastAutoTable is attached by the plugin at runtime
    startY: doc.lastAutoTable.finalY + 18,
    head: [["ID", "Sq ft", "Beds", "Baths", "Year", "Lot (sq ft)", "Distance", "School", "Price", "Price / sq ft"]],
    body: rows.map((r) => [
      r.id,
      formatFeatureValue("square_footage", r.square_footage),
      r.bedrooms,
      r.bathrooms,
      r.year_built,
      formatFeatureValue("lot_size", r.lot_size),
      r.distance_to_city_center,
      r.school_rating,
      formatPrice(r.price),
      formatPricePerSqft(r.price_per_sqft),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: { 8: { halign: "right" }, 9: { halign: "right" } },
    margin: { left: margin, right: margin, bottom: 36 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }
  doc.save("housing-market-report.pdf");
  return rows.length;
}
