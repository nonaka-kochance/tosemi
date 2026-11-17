# 試し版（架空の生徒・ログインは何を入れても通る）を作る。../gas/Index.html を作り直したあとに実行
import os
here = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(here, '..', 'gas', 'Index.html'), encoding='utf-8').read()
mock = open(os.path.join(here, 'mock.js'), encoding='utf-8').read()
t = t.replace('<base target="_top">\n', '')
t = t.replace('<title>内申点チェック</title>', '<title>内申点チェック 試し版</title>')
t = t.replace('<div id="banner" hidden></div>', '<div class="trial">試し版：架空の生徒です。IDとパスワードは何を入れても入れます。</div>\n<div id="banner" hidden></div>')
t = t.replace('</style>', '.trial{background:#fff4dc;color:#b86a00;font-weight:800;font-size:13px;text-align:center;padding:8px 12px}\n</style>\n<script>\n' + mock + '</script>', 1)
open(os.path.join(here, 'preview.html'), 'w', encoding='utf-8').write(t)
print('ok', len(t))
