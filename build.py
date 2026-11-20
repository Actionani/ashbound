"""Builds Ashbound into one page.
  python3 build.py           -> index.html for GitHub Pages (offline-capable, with manifest + service worker)
  python3 build.py artifact  -> dist/artifact.html for the Claude artifact (no service worker)
"""
import pathlib, sys, hashlib
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
target = sys.argv[1] if len(sys.argv) > 1 else 'pages'
core, ui, css = (src/'core.js').read_text(), (src/'ui.js').read_text(), (src/'style.css').read_text()
version = hashlib.sha1((core + ui + css).encode()).hexdigest()[:10]
pwa_head = '''<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><link rel="icon" href="icon-192.png">''' if target == 'pages' else ''
pwa_tail = '''<script>
if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }
</script>''' if target == 'pages' else ''
html = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Ashbound">
<meta name="theme-color" content="#0d0c10"><meta name="ashbound-version" content="{version}">
<title>Ashbound</title>{pwa_head}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=Barlow+Condensed:wght@700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
<style>
{css}
</style></head><body>
<div id="embers"></div><main id="app"></main>
<script>
{core}
</script>
<script>
{ui}
</script>
{pwa_tail}
</body></html>
'''
if target == 'pages':
    (root/'index.html').write_text(html)
    sw = (root/'tools'/'sw.template.js').read_text().replace('__VERSION__', version)
    (root/'sw.js').write_text(sw)
    print('built index.html + sw.js, version', version)
else:
    (root/'dist').mkdir(exist_ok=True)
    (root/'dist'/'artifact.html').write_text(html)
    print('built dist/artifact.html, version', version)
