"""axe-core WCAG 2.1 A/AA scan of the Market Analysis page (both tabs, light + dark), mobile overflow, screenshots.
Setup: cd e2e && npm i axe-core.  Run: python e2e/market_a11y.py  (SHOTS_DIR env var saves screenshots)"""
import asyncio, os
from playwright.async_api import async_playwright
AXE = open(os.path.join(os.path.dirname(__file__), "node_modules/axe-core/axe.min.js")).read()
URL = os.environ.get("PORTAL_URL", "http://localhost:3000") + "/market"
SHOTS = os.environ.get("SHOTS_DIR")
async def scan(pg, label):
    await pg.evaluate(AXE)
    r = await pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa']})")
    v = [(x['id'], x['impact'], [n['target'][0][:70] for n in x['nodes'][:3]]) for x in r['violations']]
    print(label, "->", v if v else "no violations"); return v
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ("light", "dark"):
            ctx = await b.new_context(viewport={"width": 1280, "height": 900}, color_scheme=scheme); pg = await ctx.new_page()
            await pg.goto(URL); await pg.wait_for_selector("text=Properties"); await pg.wait_for_timeout(500)
            bad += await scan(pg, f"{scheme}: overview")
            if SHOTS: await pg.screenshot(path=f"{SHOTS}/{scheme}-overview.png", full_page=True)
            await pg.get_by_role("button", name="Apply filters").click(); await pg.wait_for_timeout(300)
            await pg.locator("details summary").first.click(); await pg.wait_for_timeout(200)
            bad += await scan(pg, f"{scheme}: overview + open data table")
            await pg.goto(URL + "?minPrice=900000"); await pg.wait_for_selector("text=No homes match"); bad += await scan(pg, f"{scheme}: empty state")
            await pg.goto(URL); await pg.get_by_role("tab", name="What-if analysis").click()
            bad += await scan(pg, f"{scheme}: what-if (idle)")
            await pg.fill("#wi-scen-square_footage", "5000"); await pg.get_by_role("button", name="Compare scenario").click(); await pg.wait_for_selector("[data-testid=wi-delta]")
            await pg.get_by_role("button", name="Plot price curve").click(); await pg.wait_for_selector("[data-testid=price-curve] svg"); await pg.wait_for_timeout(500)
            bad += await scan(pg, f"{scheme}: what-if (result + warning + curve)")
            if SHOTS: await pg.screenshot(path=f"{SHOTS}/{scheme}-whatif.png", full_page=True)
            await pg.fill("#wi-scen-school_rating", "99"); await pg.get_by_role("button", name="Compare scenario").click(); await pg.wait_for_timeout(200)
            bad += await scan(pg, f"{scheme}: what-if (validation error)")
            await ctx.close()
        m = await (await b.new_context(viewport={"width": 390, "height": 800})).new_page()
        for tab in ("Market overview", "What-if analysis"):
            await m.goto(URL); await m.get_by_role("tab", name=tab).click(); await m.wait_for_timeout(400)
            if tab.startswith("What"):
                await m.get_by_role("button", name="Plot price curve").click(); await m.wait_for_selector("[data-testid=price-curve] svg"); await m.wait_for_timeout(400)
            print(f"mobile {tab}: horizontal page overflow =", await m.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
            if SHOTS: await m.screenshot(path=f"{SHOTS}/mobile-{tab.split()[0].lower()}.png", full_page=True)
        await b.close()
    print("TOTAL violations:", len(bad))
asyncio.run(main())
