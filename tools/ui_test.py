import asyncio, sys
from playwright.async_api import async_playwright
import os
URL = os.environ.get('ASHBOUND_URL', 'http://localhost:8765/index.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await page.goto(URL)
        await page.wait_for_selector('#begin', timeout=8000)
        await page.screenshot(path='shots/1_menu.png')
        await page.click('#begin'); await page.wait_for_timeout(400)
        await page.screenshot(path='shots/2_howto.png')
        await page.click('#go'); await page.wait_for_timeout(400)
        await page.screenshot(path='shots/3_path.png')
        await page.click('#fight'); await page.wait_for_timeout(1500)
        await page.screenshot(path='shots/4_battle.png')
        fights = 0
        for step in range(400):
            if await page.query_selector('#bt'):
                busy = await page.evaluate('document.querySelector("#end") && document.querySelector("#end").disabled')
                if busy: await page.wait_for_timeout(300); continue
                cards = await page.query_selector_all('#hand .card:not(.off)')
                played = False
                for c in cards[:1]:
                    await c.click(force=True); await page.wait_for_timeout(120)
                    sel = await page.query_selector('#hand .card.sel')
                    if sel: await sel.click(force=True); played = True
                    await page.wait_for_timeout(200)
                if not played:
                    if fights == 0 and step < 40: await page.screenshot(path='shots/5_battle_mid.png')
                    burn = await page.query_selector('#burn.ready')
                    if burn: await burn.click(force=True); await page.wait_for_timeout(900); continue
                    await page.click('#end'); await page.wait_for_timeout(300)
                continue
            if await page.query_selector('#take'):
                txt = await page.inner_text('h1')
                if 'Victory' in txt:
                    fights += 1
                    if fights == 1: await page.screenshot(path='shots/6_reward.png', full_page=False)
                    panels = await page.query_selector_all('.panel')
                    await panels[-1 if fights == 2 else 0].click(); await page.wait_for_timeout(150)
                    await page.click('#take'); await page.wait_for_timeout(400)
                else:
                    await page.screenshot(path='shots/7_augment.png')
                    await (await page.query_selector_all('.panel'))[0].click()
                    await page.click('#take'); await page.wait_for_timeout(400)
                continue
            if await page.query_selector('#fight'):
                if fights == 3: await page.screenshot(path='shots/8_path_later.png')
                await page.click('#fight'); await page.wait_for_timeout(1200); continue
            if await page.query_selector('#shrine') and await page.query_selector('#menu'):
                await page.screenshot(path='shots/9_end.png')
                await page.click('#shrine'); await page.wait_for_timeout(400)
                await page.screenshot(path='shots/10_shrine.png')
                break
            await page.wait_for_timeout(300)
        print('fights won:', fights, 'steps:', step)
        print('errors:', errs[:10])
        await b.close()
asyncio.run(main())
