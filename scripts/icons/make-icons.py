# Makes the milim app icon (src/app/icon.svg, favicon.ico, apple-icon.png).
# Needs: pip install fonttools brotli cairosvg pillow, and Heebo[wght].ttf (Google Fonts, OFL) saved as Heebo.ttf next to this file.
# Run from this folder; files land in ./out, then copy them to src/app/. To try another font, change Heebo.ttf and re-run.
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
f = instancer.instantiateVariableFont(TTFont("Heebo.ttf"), {"wght": 800})
gs = f.getGlyphSet(); name = f.getBestCmap()[0x05DE]
bp = BoundsPen(gs); gs[name].draw(bp); x0,y0,x1,y1 = bp.bounds
print("bounds", bp.bounds)
def path(target_h, cx=32, cy=32):
    s = target_h/(y1-y0)
    # flip Y, scale, centre bbox on (cx,cy)
    tx = cx - s*(x0+x1)/2
    ty = cy + s*(y0+y1)/2
    pen = SVGPathPen(gs, ntos=lambda v: ("%.2f"%v).rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen,(s,0,0,-s,tx,ty)))
    return pen.getCommands(), s*(x1-x0)
d,w = path(46); print("width at 46:", w)
open("d46.txt","w").write(d)
# letter at 60% of 64 tall box for full-bleed (apple); 80% safe zone for maskable
for tag,h in (("tile",46),("apple",0.60*64),("mask",0.46*64)):
    open(f"d_{tag}.txt","w").write(path(h)[0])

# maskable/apple letter sizes
open("d_mask.txt","w").write(path(36)[0])
open("d_apple.txt","w").write(path(38.4)[0])
D = {t: open(f"d_{t}.txt").read() for t in ("tile","apple","mask")}
BLUE, CREAM = "#2E6C99", "#FFF0D6"
def svg(kind, stroke=True):
    if kind == "tile":
        bg = f'<rect width="64" height="64" rx="14" fill="{BLUE}"/>'
        if stroke: bg += '<rect x="0.5" y="0.5" width="63" height="63" rx="13.5" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>'
    else:
        bg = f'<rect width="64" height="64" fill="{BLUE}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{bg}<path fill="{CREAM}" d="{D[kind]}"/></svg>'
import cairosvg, io
from PIL import Image
out = "out"; import os; os.makedirs(out, exist_ok=True)
open(f"{out}/favicon.svg","w").write(svg("tile"))
def png(s, size): return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(), output_width=size, output_height=size))).convert("RGBA")
# ico: 16,32 without inner stroke; 48 with
ims = [png(svg("tile", False),16), png(svg("tile", False),32), png(svg("tile", True),48)]
ims[2].save(f"{out}/favicon.ico", format="ICO", sizes=[(16,16),(32,32),(48,48)], append_images=ims[:2])
png(svg("apple"),180).convert("RGB").save(f"{out}/apple-touch-icon.png")
for s in (16,32,48,128): png(svg("tile", s>32), s).save(f"{out}/prev{s}.png")
png(svg("apple"),180).save(f"{out}/prev-apple.png")
