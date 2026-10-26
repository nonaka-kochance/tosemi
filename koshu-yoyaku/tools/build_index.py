"""index.template.html にヒーロー写真を埋め込んで gas/index.html を作る。

使い方（このフォルダの1つ上で）:  python3 tools/build_index.py [写真.jpg]
写真を省略すると assets/hero.jpg を使う。横長（16:10くらい）・幅800px程度・100KB以下が目安。
"""
import base64, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
photo = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "assets" / "hero.jpg"
tpl = (root / "tools" / "index.template.html").read_text(encoding="utf-8")
b64 = base64.b64encode(photo.read_bytes()).decode()
(root / "gas" / "index.html").write_text(tpl.replace("__HERO__", "data:image/jpeg;base64," + b64), encoding="utf-8")
print("gas/index.html を作りました")
