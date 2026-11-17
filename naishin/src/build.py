# Apps Script に貼る Index.html を作る。src/ の部品を1つにまとめるだけ（計算は ui.js の中）。
#   python3 build.py   （このフォルダで実行）→ ../gas/Index.html
import os, base64
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
body = rd('body.html')
png = os.path.join(here, 'tentori.png')
if os.path.exists(png):
    b64 = base64.b64encode(open(png, 'rb').read()).decode()
    i1 = body.index('<svg class="swoosh"'); i2 = body.index('</svg>', i1) + 6
    j = body.rindex('<p class="logo">', 0, i1)
    logo = body[j:i1].rstrip()
    body = body[:j] + '<div class="gate-head">' + logo + '<img class="tentori" alt="点取くん" src="data:image/png;base64,' + b64 + '"></div>' + body[i2:]
out = """<!DOCTYPE html>
<html lang="ja">
<head>
<base target="_top">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>内申点チェック</title>
<style>
""" + rd('sp.css') + rd('extra.css') + "</style>\n</head>\n<body>\n" + body + "<script>\n" + rd('ui.js') + "</script>\n<script>\n" + rd('boot.js') + "</script>\n</body>\n</html>\n"
open(os.path.join(os.path.dirname(here), 'gas', 'Index.html'), 'w', encoding='utf-8').write(out)
print('ok', len(out))
