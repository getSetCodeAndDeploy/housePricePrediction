"""End-to-end check of Market Analysis (stage 8).

Needs: model-api :8000, an App 2 backend on :8002 (the real Java one, or app2-backend/dev-mock), portal :3000.
Run:  python e2e/market_flow.py   (PORTAL_URL overrides http://localhost:3000)
"""
import asyncio, os, re, subprocess, tempfile
from playwright.async_api import async_playwright, expect
PORTAL = os.environ.get("PORTAL_URL", "http://localhost:3000")
BASE = PORTAL + "/market"
ok = lambda m: print("PASS", m)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True)
        pg = await ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))

        await pg.goto(BASE)
        await expect(pg.get_by_role("heading", name="Market Analysis")).to_be_visible()
        await expect(pg.get_by_text("50", exact=True).first).to_be_visible()
        assert await pg.locator('[aria-label="Properties table"] tbody tr').count() == 10; ok("overview renders: 50 homes, 10 rows on page 1")

        # preset -> URL state + fewer homes
        await pg.get_by_role("button", name="4+ bedrooms").click()
        await pg.wait_for_url(re.compile(r"minBedrooms=4"))
        await expect(pg.get_by_role("button", name="4+ bedrooms")).to_have_attribute("aria-pressed", "true")
        n = int(await pg.locator("p[role=status] .font-medium.tabular-nums").first.inner_text())
        assert 0 < n < 50; ok(f"preset filters via URL ({n} homes match)")

        # manual range + validation
        await pg.get_by_role("button", name="All homes").click()
        await pg.wait_for_url(lambda u: "minBedrooms" not in u)
        await pg.fill('[aria-label="Price ($) minimum"]', "300000")
        await pg.fill('[aria-label="Price ($) maximum"]', "200000")
        await pg.get_by_role("button", name="Apply filters").click()
        await expect(pg.get_by_text(re.compile("minimum.*(greater|higher|exceed)|min.*max", re.I)).first).to_be_visible(); ok("min > max rejected client-side")
        await pg.fill('[aria-label="Price ($) minimum"]', "200000")
        await pg.fill('[aria-label="Price ($) maximum"]', "300000")
        await pg.get_by_role("button", name="Apply filters").click()
        await pg.wait_for_url(re.compile(r"minPrice=200000"))
        prices = [int(re.sub(r"\D", "", t)) for t in await pg.locator("tbody tr td:last-child").all_inner_texts()] if False else None
        await expect(pg.get_by_label("Active filters")).to_be_visible(); ok("range filter applied, chips shown")

        # sorting (server-side)
        await pg.get_by_role("button", name=re.compile("^Price")).first.click()
        await pg.wait_for_url(re.compile(r"sortBy=price"))
        await expect(pg.locator('th[aria-sort="ascending"]')).to_have_count(1)
        await pg.get_by_role("button", name=re.compile("^Price")).first.click()
        await expect(pg.locator('th[aria-sort="descending"]')).to_have_count(1); ok("sort asc/desc toggles aria-sort")

        # paging + reload persistence
        await pg.get_by_role("button", name="All homes").click()
        await pg.wait_for_url(lambda u: "minPrice" not in u)
        await pg.get_by_role("button", name="Next").click()
        await pg.wait_for_url(re.compile(r"page=1"))
        await expect(pg.get_by_text("Page 2 of 5", exact=True)).to_be_visible()
        await pg.reload()
        await expect(pg.get_by_text("Page 2 of 5", exact=True)).to_be_visible(); ok("paging + state survives reload")

        # empty result
        await pg.goto(BASE + "?minPrice=900000")
        await expect(pg.get_by_text("No homes match these filters")).to_be_visible(); ok("empty state")
        await pg.get_by_role("button", name="Clear all filters").first.click()
        await pg.wait_for_url(lambda u: "minPrice" not in u); ok("reset from empty state")

        # CSV
        async with pg.expect_download() as d:
            await pg.get_by_role("link", name="Export CSV").click()
        dl = await d.value; path = tempfile.mktemp(suffix=".csv"); await dl.save_as(path)
        lines = open(path).read().strip().splitlines(); assert len(lines) == 51, len(lines); ok(f"CSV export: header + {len(lines)-1} rows ({dl.suggested_filename})")

        # PDF
        async with pg.expect_download(timeout=30000) as d:
            await pg.get_by_role("button", name="Export PDF").click()
        dl = await d.value; pdf = "/tmp/claude-0/logs/report.pdf"; await dl.save_as(pdf)
        txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout
        assert "Housing market report" in txt and re.search(r"Page 1 of 3", txt); assert len(re.findall(r"^\s*\d+\s+[\d,]+\s+\d", txt, re.M)) == 50
        ok(f"PDF export ({dl.suggested_filename}, {len(txt.splitlines())} text lines)")

        # tabs keyboard
        await pg.get_by_role("tab", name="What-if analysis").focus()
        await pg.keyboard.press("Enter")
        await expect(pg.get_by_role("tabpanel", name=re.compile("What-if"))).to_be_visible(); ok("tabs switch")

        # what-if
        await pg.fill("#wi-scen-square_footage", "1900")
        await pg.get_by_role("button", name="Compare scenario").click()
        await expect(pg.get_by_test_id("wi-delta")).to_be_visible()
        delta = await pg.get_by_test_id("wi-delta").inner_text(); assert delta.strip().startswith("+"), delta
        ok(f"what-if: bigger living area raises price ({delta.strip()[:24]})")
        await pg.fill("#wi-scen-square_footage", "1550")  # back to base
        await pg.get_by_role("button", name="Compare scenario").click()
        await expect(pg.get_by_text("Change at least one value")).to_be_visible(); ok("no-change scenario is guarded")
        await pg.fill("#wi-scen-school_rating", "99")
        await pg.get_by_role("button", name="Compare scenario").click()
        await expect(pg.locator("#wi-scen-school_rating-err")).to_be_visible(); ok("scenario field validation")
        await pg.fill("#wi-scen-school_rating", "8.5")
        await pg.fill("#wi-scen-square_footage", "5000")
        await pg.get_by_role("button", name="Compare scenario").click()
        await expect(pg.get_by_text("Outside the range the model was trained on")).to_be_visible(); ok("extrapolation warning shown")

        # price curve
        await pg.get_by_role("button", name="Plot price curve").click()
        await expect(pg.get_by_test_id("price-curve").locator("svg")).to_be_visible(); ok("price curve renders")
        await pg.get_by_test_id("price-curve").locator("svg").focus()

        assert not [e for e in errs if "favicon" not in e], errs; ok("no console errors")
        await b.close()

asyncio.run(main())
