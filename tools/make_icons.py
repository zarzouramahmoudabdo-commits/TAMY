from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageFilter
import math, os, sys

S = 2048
GOLD1, GOLD2 = (240, 208, 96), (190, 144, 30)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def vgrad(size, top, bottom):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    return img

def background():
    bg = vgrad(S, (18, 128, 82), (4, 52, 33))
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).ellipse([S*0.1, S*0.02, S*0.9, S*0.8], fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(S*0.12))
    bg = Image.composite(Image.new('RGB', (S, S), (40, 170, 110)), bg, glow)
    d = ImageDraw.Draw(bg, 'RGBA')
    step = S // 24
    for yy in range(0, S, step):
        for xx in range(0, S, step):
            d.ellipse([xx, yy, xx+7, yy+7], fill=(255, 255, 255, 14))
    return bg

def gold_fill(mask):
    g = vgrad(S, GOLD1, GOLD2)
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    layer.paste(g, (0, 0), mask)
    return layer

def star(cx, cy, r, points=5, inner=0.42, rot=-90):
    pts = []
    for i in range(points * 2):
        rad = r if i % 2 == 0 else r * inner
        a = math.radians(rot + i * 180 / points)
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return pts

def content():
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ring = Image.new('L', (S, S), 0)
    rd = ImageDraw.Draw(ring)
    cx, cy, R = S*0.5, S*0.40, S*0.31
    rd.ellipse([cx-R, cy-R, cx+R, cy+R], outline=255, width=int(S*0.012))
    ring = ring.point(lambda v: int(v*0.55))
    layer.alpha_composite(gold_fill(ring))
    m1 = Image.new('L', (S, S), 0); m2 = Image.new('L', (S, S), 0)
    r1 = S*0.17
    ImageDraw.Draw(m1).ellipse([S*0.47-r1, S*0.36-r1, S*0.47+r1, S*0.36+r1], fill=255)
    r2 = S*0.145
    ImageDraw.Draw(m2).ellipse([S*0.55-r2, S*0.33-r2, S*0.55+r2, S*0.33+r2], fill=255)
    cres = ImageChops.subtract(m1, m2)
    sh = cres.filter(ImageFilter.GaussianBlur(S*0.01))
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 90), (int(S*0.006), int(S*0.012)), sh)
    layer.alpha_composite(shadow)
    layer.alpha_composite(gold_fill(cres))
    sm = Image.new('L', (S, S), 0)
    ImageDraw.Draw(sm).polygon(star(S*0.60, S*0.335, S*0.055), fill=255)
    layer.alpha_composite(gold_fill(sm))
    book = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(book)
    def P(pts): return [(x*S, y*S) for x, y in pts]
    left = [(0.5, 0.605), (0.40, 0.575), (0.26, 0.585), (0.23, 0.600), (0.23, 0.770), (0.26, 0.755), (0.40, 0.745), (0.5, 0.775)]
    right = [(1-x, y) for x, y in left]
    bsh = Image.new('L', (S, S), 0)
    ImageDraw.Draw(bsh).polygon(P(left), fill=255); ImageDraw.Draw(bsh).polygon(P(right), fill=255)
    bsh = bsh.filter(ImageFilter.GaussianBlur(S*0.012))
    sh2 = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sh2.paste((0, 0, 0, 110), (0, int(S*0.016)), bsh)
    layer.alpha_composite(sh2)
    bd.polygon(P(left), fill=(255, 248, 224, 255))
    bd.polygon(P(right), fill=(244, 234, 200, 255))
    for pts in (left, right):
        bd.line(P(pts + [pts[0]]), fill=GOLD2 + (255,), width=int(S*0.008), joint='curve')
    for i in range(4):
        y = 0.625 + i*0.027
        bd.line(P([(0.28, y+0.002), (0.46, y-0.006)]), fill=(190, 160, 70, 200), width=int(S*0.006))
        bd.line(P([(0.54, y-0.006), (0.72, y+0.002)]), fill=(190, 160, 70, 200), width=int(S*0.006))
    bd.line(P([(0.5, 0.605), (0.5, 0.775)]), fill=GOLD2 + (255,), width=int(S*0.008))
    layer.alpha_composite(book)
    f = ImageFont.truetype(FONT, int(S*0.115))
    text = 'TAMY'
    sp = int(S*0.022)
    widths = [f.getlength(ch) for ch in text]
    total = sum(widths) + sp*(len(text)-1)
    x = (S - total)/2; y = S*0.805
    tm = Image.new('L', (S, S), 0); td = ImageDraw.Draw(tm)
    for ch, w in zip(text, widths):
        td.text((x, y), ch, font=f, fill=255); x += w + sp
    tsh = tm.filter(ImageFilter.GaussianBlur(S*0.006))
    sh3 = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sh3.paste((0, 0, 0, 130), (0, int(S*0.008)), tsh)
    layer.alpha_composite(sh3)
    cream = Image.new('RGBA', (S, S), (0, 0, 0, 0)); cream.paste((255, 247, 220, 255), (0, 0), tm)
    layer.alpha_composite(cream)
    return layer

def scaled(layer, k):
    n = int(S*k)
    small = layer.resize((n, n), Image.LANCZOS)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.alpha_composite(small, ((S-n)//2, (S-n)//2))
    return out

def rounded(img, radius_frac=0.22):
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S-1, S-1], radius=int(S*radius_frac), fill=255)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(img.convert('RGBA'), (0, 0), mask)
    return out

root = sys.argv[1]
os.makedirs(f'{root}/www/icons', exist_ok=True)
os.makedirs(f'{root}/assets', exist_ok=True)
bg = background().convert('RGBA')
cont = content()

a = bg.copy(); a.alpha_composite(scaled(cont, 1.0))
a = rounded(a)
a.resize((512, 512), Image.LANCZOS).save(f'{root}/www/icons/icon-512.png')
a.resize((192, 192), Image.LANCZOS).save(f'{root}/www/icons/icon-192.png')
m = bg.copy(); m.alpha_composite(scaled(cont, 0.78))
m.resize((512, 512), Image.LANCZOS).save(f'{root}/www/icons/icon-maskable-512.png')
o = bg.copy(); o.alpha_composite(scaled(cont, 0.86))
o.resize((1024, 1024), Image.LANCZOS).convert('RGB').save(f'{root}/assets/icon-only.png')
scaled(cont, 0.62).resize((1024, 1024), Image.LANCZOS).save(f'{root}/assets/icon-foreground.png')
bg.resize((1024, 1024), Image.LANCZOS).convert('RGB').save(f'{root}/assets/icon-background.png')
a.resize((64, 64), Image.LANCZOS).save(f'{root}/www/icons/favicon.png')
print('ok')
