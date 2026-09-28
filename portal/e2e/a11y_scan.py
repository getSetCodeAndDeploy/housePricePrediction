"""Automated WCAG 2.1 A/AA scan (axe-core) of every estimator state, light + dark, plus a mobile overflow check.

Setup:  cd e2e && npm i axe-core && pip install playwright && playwright install chromium
Run:    python e2e/a11y_scan.py
"""
import asyncio, os
from playwright.async_api import async_playwright
AXE = open(os.path.join(os.path.dirname(__file__), "node_modules/axe-core/axe.min.js")).read()
A=dict(square_footage=1550,bedrooms=3,bathrooms=2,year_built=1997,lot_size=6800,distance_to_city_center=4.1,school_rating=7.6)
B=dict(square_footage=2200,bedrooms=4,bathrooms=2.5,year_built=2008,lot_size=9600,distance_to_city_center=7,school_rating=8.8)
async def scan(pg, label):
    await pg.evaluate(AXE)
    r = await pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa']})")
    v = [(x['id'], x['impact'], [n['target'][0][:60] for n in x['nodes'][:2]]) for x in r['violations']]
    print(label, "->", v if v else "no violations")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ("light","dark"):
            ctx = await b.new_context(viewport={"width":1280,"height":900}, color_scheme=scheme); pg = await ctx.new_page()
            await pg.goto("http://localhost:3000/estimator"); await pg.wait_for_selector("text=No estimate yet")
            await scan(pg, f"{scheme}: empty")
            await pg.click("text=Estimate price"); await pg.wait_for_timeout(300); await scan(pg, f"{scheme}: validation errors")
            for name, vals in (("Maple St",A),("Oak Ave",B)):
                for k,v in vals.items(): await pg.fill(f"#field-{k}", str(v))
                await pg.fill("#field-label", name); await pg.click("text=Estimate price"); await pg.wait_for_selector(f"text={name}")
                await pg.wait_for_timeout(400)
            await scan(pg, f"{scheme}: result + history")
            await pg.get_by_label("Select Maple St for comparison").check(); await pg.get_by_label("Select Oak Ave for comparison").check()
            await pg.get_by_role("button", name="Compare (2)").click(); await pg.wait_for_selector("#comparison"); await pg.wait_for_timeout(700)
            await scan(pg, f"{scheme}: comparison")
            if scheme=="light":
                # keyboard: focusing a chart row shows the tooltip
                await pg.locator("figure li").first.focus(); await pg.wait_for_timeout(200)
                print("tooltip on keyboard focus:", await pg.locator("[role=tooltip]").count()==1)
            await pg.evaluate("fetch('/api/app1/api/estimates',{method:'DELETE'})"); await ctx.close()
        m = await (await b.new_context(viewport={"width":390,"height":800})).new_page()
        await m.goto("http://localhost:3000/estimator"); await m.wait_for_selector("text=No estimate yet")
        for k,v in A.items(): await m.fill(f"#field-{k}", str(v))
        await m.click("text=Estimate price"); await m.wait_for_selector("[data-testid=predicted-price]"); await m.wait_for_timeout(400)
        print("mobile horizontal page overflow:", await m.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
        await m.evaluate("fetch('/api/app1/api/estimates',{method:'DELETE'})")
        await b.close()
asyncio.run(main())
