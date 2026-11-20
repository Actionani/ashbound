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
                elif 'Empower' in txt:
                    await page.screenshot(path='shots/6b_empower.png')
                    await (await page.query_selector_all('.emp-pick .card'))[-1].click(); await page.wait_for_timeout(200)
                    await page.screenshot(path='shots/6c_empower_pick.png')
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
        # Scenario: a saved run waiting on its reward (checks reward -> Empower -> battle with stars)
        await page.evaluate('''() => {
          const meta = Core.newMeta(); meta.seenTutorial = true;
          const r = Core.Run.create(meta, 99);
          r.deck.push('fireball', 'spellstorm', 'familiar', 'leechBite', 'boneHarvest'); r.stars = r.deck.map((_, i) => i % 3);
          Core.Run.winFight(r, { ashGainedTotal: 3, bestTurn: 41 }, meta);
          localStorage.setItem('ashbound.web.v1', JSON.stringify({ meta, run: r, savedAt: Date.now() + 1e7 }));
        }''')
        await page.reload(); await page.wait_for_selector('#cont', timeout=8000)
        await page.click('#cont'); await page.wait_for_timeout(400)
        await (await page.query_selector_all('.panel'))[0].click(); await page.click('#take'); await page.wait_for_timeout(500)
        await page.screenshot(path='shots/11_empower.png')
        picks = await page.query_selector_all('.emp-pick .card')
        await picks[len(picks)//2].click(); await page.wait_for_timeout(200)
        await page.screenshot(path='shots/12_empower_preview.png')
        await page.click('#take'); await page.wait_for_timeout(500)
        await page.click('#deck'); await page.wait_for_timeout(300)
        await page.screenshot(path='shots/13_deck_stars.png')
        await page.click('.modal .btn'); await page.click('#fight'); await page.wait_for_timeout(1500)
        for _ in range(6):
            cards = await page.query_selector_all('#hand .card:not(.off)')
            if cards:
                await cards[0].click(force=True); await page.wait_for_timeout(100)
                sel = await page.query_selector('#hand .card.sel')
                if sel: await sel.click(force=True)
                await page.wait_for_timeout(500)
            else:
                await page.click('#end'); await page.wait_for_timeout(1800)
        await page.screenshot(path='shots/14_battle_stars.png')
        print('errors:', errs[:10])
        await b.close()
asyncio.run(main())
