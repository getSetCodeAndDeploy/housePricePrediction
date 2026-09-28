"""End-to-end check of the Property Value Estimator (stage 7).

Needs the full stack running (model-api :8000, app1-backend :8001, portal :3000) and:
    pip install playwright && playwright install chromium
Run:  python e2e/estimator_flow.py           (PORTAL_URL env var overrides http://localhost:3000)
It clears the saved history first, so run it against a dev/demo database.
"""
import asyncio, os, re
from playwright.async_api import async_playwright, expect
PORTAL=os.environ.get("PORTAL_URL","http://localhost:3000")
BASE=PORTAL+"/estimator"
async def fill(pg, vals):
    for k,v in vals.items(): await pg.fill(f"#field-{k}", str(v))
A=dict(square_footage=1550,bedrooms=3,bathrooms=2,year_built=1997,lot_size=6800,distance_to_city_center=4.1,school_rating=7.6)
B=dict(square_footage=2200,bedrooms=4,bathrooms=2.5,year_built=2008,lot_size=9600,distance_to_city_center=7,school_rating=8.8)
C=dict(square_footage=1180,bedrooms=2,bathrooms=1,year_built=1982,lot_size=5100,distance_to_city_center=2.5,school_rating=6.7)
ok=lambda m: print("PASS", m)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width":1280,"height":900})
        await ctx.request.delete(PORTAL+"/api/app1/api/estimates")  # start from an empty history
        pg = await ctx.new_page()
        errs=[]; pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE); await pg.wait_for_selector("text=No estimate yet")
        ok("empty state renders (no history yet)")
        # 1. submit empty -> errors + focus on first invalid field + summary
        await pg.click("text=Estimate price")
        await expect(pg.locator("#field-square_footage-error")).to_have_text("Living area is required")
        assert await pg.evaluate("document.activeElement.id") == "field-square_footage"; ok("empty submit: 7 errors, focus moves to first invalid field")
        await expect(pg.locator("#form-summary")).to_be_visible()
        assert await pg.locator("[aria-invalid=true]").count()==7; ok("all 7 fields marked aria-invalid")
        # 2. specific messages
        await pg.fill("#field-school_rating","12"); await pg.locator("#field-school_rating").blur()
        await expect(pg.locator("#field-school_rating-error")).to_have_text("Must be at most 10"); ok("range error: school 12 -> 'Must be at most 10'")
        await pg.fill("#field-bedrooms","2.5"); await expect(pg.locator("#field-bedrooms-error")).to_have_text("Enter a whole number"); ok("live re-validation: bedrooms 2.5 -> whole number")
        await pg.fill("#field-lot_size","abc"); await expect(pg.locator("#field-lot_size-error")).to_have_text("Enter a number"); ok("non-numeric -> 'Enter a number'")
        await pg.fill("#field-square_footage","200"); await expect(pg.locator("#field-square_footage-error")).to_have_text("Must be greater than 200"); ok("exclusive minimum: 200 -> 'Must be greater than 200'")
        # 3. real estimate
        await pg.click("text=Reset"); await fill(pg, A); await pg.fill("#field-label","Maple St")
        await pg.click("text=Estimate price")
        await expect(pg.locator("[data-testid=predicted-price]")).to_have_text("$250,199"); ok("estimate A = $250,199 (matches model API)")
        rows = await pg.locator("figure li").count(); assert rows==7; ok("chart shows 7 feature bars")
        tot = await pg.locator("tfoot td").last.inner_text(); assert tot=="$250,199"
        # 4. two more estimates, compare
        await pg.click("text=Reset"); await fill(pg,B); await pg.fill("#field-label","Oak Ave"); await pg.click("text=Estimate price"); await expect(pg.locator("[data-testid=predicted-price]")).to_have_text("$365,273")
        await pg.click("text=Reset"); await fill(pg,C); await pg.click("text=Estimate price"); await expect(pg.locator("[data-testid=predicted-price]")).to_have_text("$163,358")
        ok("3 estimates saved; history has 3 rows"); assert await pg.locator("[aria-label=\"Estimate history table\"] tbody tr").count()>=3
        await expect(pg.get_by_role("button", name=re.compile(r"^Compare")) ).to_be_disabled(); ok("Compare disabled until 2 selected")
        await pg.get_by_label("Select Maple St for comparison").check(); await pg.get_by_label("Select Oak Ave for comparison").check()
        await pg.get_by_role("button", name=re.compile(r"^Compare")).click()
        await expect(pg.locator("#comparison")).to_be_visible(); await pg.wait_for_timeout(600)
        txt = await pg.locator("#comparison").inner_text(); assert "+$115,075" in txt and "Best value" in txt; ok("comparison: Oak Ave is +$115,075 vs Maple St; best-value badge shown")
        # 5. persistence via server component after reload
        await pg.reload(); await pg.wait_for_selector("[aria-label=\"Estimate history table\"] tbody tr"); assert await pg.locator("[aria-label=\"Estimate history table\"] tbody tr").count()==3; ok("reload: history loaded server-side (3 rows)")
        # 6. view + delete
        await pg.get_by_role("button", name="View Maple St").click(); await expect(pg.locator("[data-testid=predicted-price]")).to_have_text("$250,199"); ok("View switches the result panel")
        await pg.get_by_role("button", name="Delete Maple St").click(); await expect(pg.locator("[aria-label=\"Estimate history table\"] tbody tr")).to_have_count(2); ok("delete removes row")
        # 7. clear all needs confirmation
        await pg.click("text=Clear all"); await pg.click("text=Yes, delete all"); await expect(pg.locator("text=No saved estimates")).to_be_visible(); ok("clear all (with confirm) empties history")
        # 8. extrapolation warning
        await fill(pg, {**A,"square_footage":9000}); await pg.click("text=Estimate price"); await expect(pg.locator("text=Outside the range the model was trained on")).to_be_visible(); ok("out-of-range input shows extrapolation warning")
        print("console errors:", errs if errs else "none")
        await b.close()
asyncio.run(main())
