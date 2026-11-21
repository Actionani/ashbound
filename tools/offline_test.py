import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto('http://localhost:8765/index.html')
        await page.wait_for_selector('#begin', timeout=8000)
        await page.evaluate("navigator.serviceWorker.ready")
        await page.wait_for_timeout(1500)
        await page.click('#begin'); await page.wait_for_timeout(300)
        await page.click('.cls'); await page.click('#go'); await page.wait_for_timeout(300)
        await ctx.set_offline(True)
        await page.reload()
        ok = await page.wait_for_selector('#cont', timeout=8000)
        print('offline reload ok, saved run continued:', bool(ok), 'errors:', errs)
        await b.close()
asyncio.run(main())
