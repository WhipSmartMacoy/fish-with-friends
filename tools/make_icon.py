"""Pixel-art iOS icon for Fish with friends: a cute fish being pulled out of the water by a bent rod.
Drawn on a 45x45 grid (same chunky, outlined look as the game's sprites), then scaled up with nearest-neighbour."""
import math, sys
from PIL import Image

N = 45
img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
px = img.load()
hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
def put(x, y, c):
    if 0 <= x < N and 0 <= y < N: px[x, y] = hexc(c) if isinstance(c, str) else c

# ---- sky: soft vertical gradient with two little clouds
top, bot = hexc("#7fd0ff"), hexc("#d4f1ff")
for y in range(N):
    t = y / 30
    c = tuple(round(top[k] + (bot[k] - top[k]) * min(1, t)) for k in range(3)) + (255,)
    for x in range(N): px[x, y] = c
for cx, cy, w in [(9, 6, 7), (36, 4, 6)]:
    for x in range(cx - w // 2, cx + w // 2 + 1): put(x, cy, "#ffffff")
    for x in range(cx - w // 2 + 1, cx + w // 2): put(x, cy - 1, "#ffffff")
    for x in range(cx - 1, cx + 2): put(x, cy - 2, "#ffffff")
    for x in range(cx - w // 2, cx + w // 2 + 1): put(x, cy + 1, "#e4f6ff")

# ---- water: wavy top edge, darker with depth, little highlight dashes
WL = 31
for x in range(N):
    wave = WL + (0 if (x // 3) % 2 else 1)
    for y in range(wave, N):
        d = y - wave
        put(x, y, "#4ab4e8" if d < 3 else "#3a9ad8" if d < 7 else "#2e82c4" if d < 11 else "#2670b0")
    put(x, wave, "#bfeaff")
for (x, y) in [(3, 36), (4, 36), (12, 40), (13, 40), (14, 40), (38, 37), (39, 37), (30, 42), (31, 42), (6, 42), (7, 42)]:
    put(x, y, "#8fd6ff")

# ---- layers with their own 1px outline
def layer(): return {}
def outline(L, col):
    out = dict(L)
    for (x, y) in L:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in L: out.setdefault(q, col)
    return out
def stamp(L):
    for (x, y), c in L.items(): put(x, y, c)

# ---- the rod: cork grip in the bottom-left, a reel, and a tip bent over by the catch
rod = layer()
pts = []
for i in range(0, 121):                 # quadratic bend: grip (1,44) -> control (9,9) -> tip (22,3)
    t = i / 120
    x = (1 - t) ** 2 * 1 + 2 * (1 - t) * t * 9 + t * t * 22
    y = (1 - t) ** 2 * 44 + 2 * (1 - t) * t * 9 + t * t * 3
    pts.append((round(x), round(y), t))
for x, y, t in pts:
    col = "#c8945a" if t < .2 else "#e8483e" if t < .9 else "#ffd23f"
    rod[(x, y)] = col
    if t < .5: rod[(x + 1, y)] = col if t >= .2 else "#a8743e"     # thicker toward the handle
for (x, y) in [(5, 33), (6, 33), (4, 34), (5, 34), (6, 34), (5, 35)]: rod[(x, y)] = "#c8ccd4"   # reel
rod[(6, 33)] = "#ffffff"
for x, y, t in pts[24::22][:-1]: rod[(x - 1, y)] = "#ffffff"      # little line guides
stamp(outline(rod, "#5a2418"))

# ---- the fish, side-on, arcing up out of the water: head up toward the rod, tail flicking the splash
fish = layer()
cx, cy, rx, ry = 30.5, 21.0, 8.6, 6.4
hx, hy = -0.76, -0.65                     # direction from tail to head (up and to the left)
l = math.hypot(hx, hy); hx, hy = hx / l, hy / l
px_, py_ = -hy, hx                        # perpendicular, pointing to the belly side (down-left)
if py_ < 0: px_, py_ = -px_, -py_
def uv(x, y):
    dx, dy = x + .5 - cx, y + .5 - cy
    return dx * hx + dy * hy, dx * px_ + dy * py_
for y in range(N):
    for x in range(N):
        u, v = uv(x, y)
        egg = rx * (1 if u > 0 else .92)
        if (u / egg) ** 2 + (v / ry) ** 2 <= 1:
            col = "#ffb03a"
            if v > ry * .3: col = "#ffd98a"                               # belly
            if v < -ry * .4 and -2 < u < rx * .6: col = "#ffcc55"         # sunlit back
            if (u / egg) ** 2 + (v / ry) ** 2 > .72 and v > -ry * .2: col = "#f08a28" if col != "#ffd98a" else "#ffc870"   # shading on the lower edge
            fish[(x, y)] = col
        # tail: a forked fan behind the body
        s = -u - rx * .78
        if 0 <= s <= 6 and abs(v) <= 1.2 + s * .95 and not (s > 4.2 and abs(v) < 1.6):
            fish.setdefault((x, y), "#ff7a3a" if abs(v) > .6 + s * .45 else "#ff9a4a")
        # dorsal fin on the back, pectoral fin on the side
        if -3 <= u <= 2.5 and -ry - 2.6 <= v <= -ry + .6 and abs(u + .3) <= (v + ry + 2.8) * 1.2:
            fish.setdefault((x, y), "#ff7a3a")
for y in range(N):
    for x in range(N):
        u, v = uv(x, y)
        if -1.5 <= u <= 1.8 and ry * .15 <= v <= ry * .75 and u - (v - ry * .15) * .9 > -1.6:
            if (x, y) in fish: fish[(x, y)] = "#ff8a3a"
def at(u, v):                              # grid cell at body coordinates
    return (int(math.floor(cx + u * hx + v * px_ - .0)), int(math.floor(cy + u * hy + v * py_ - .0)))
# big glossy eye near the head
ex, ey = at(rx * .42, -ry * .18)
for dx in range(-1, 2):
    for dy in range(-1, 2): fish[(ex + dx, ey + dy)] = "#2a1c30"
fish[(ex - 2, ey)] = "#2a1c30"; fish[(ex, ey - 2)] = "#2a1c30"
fish[(ex - 1, ey - 1)] = "#ffffff"; fish[(ex, ey - 1)] = "#ffffff"; fish[(ex - 1, ey)] = "#ffffff"
fish[(ex + 1, ey + 1)] = "#5a4a8a"
# blush and a happy open mouth on the hook
bx, by = at(rx * .1, ry * .38); fish[(bx, by)] = "#ff8aa0"; fish[(bx + 1, by)] = "#ff8aa0"
mx, my = at(rx * .9, ry * .05); fish[(mx, my)] = "#c0281a"; fish[(mx + 1, my)] = "#ff6a6a"
fo = outline(fish, "#7a2a14"); stamp(fo)

# ---- splash where the tail leaves the water: a white crown, a ripple ring and droplets flicked off the tail
tx, ty = at(-rx - 4.0, 0)
sp = layer()
for x in range(tx - 6, tx + 7):
    h = max(0, 3 - abs(x - tx) // 2)
    for y in range(WL - h, WL + 1): sp[(x, y)] = "#ffffff"
for (dx, dy) in [(-7, -3), (-8, -1), (7, -4), (8, -2), (-5, -6), (5, -7), (2, -9), (-2, -8)]:
    sp[(tx + dx, WL + dy)] = "#ffffff"
for k, c in outline(sp, "#7ac8f0").items():
    if k not in fo: put(*k, c)                       # the splash sits behind the fish's tail
for x in range(tx - 9, tx + 10):                      # ripple ring on the water
    if abs(x - tx) > 6: put(x, WL + 2, "#bfeaff")
for x in range(tx - 6, tx + 7): put(x, WL + 3 + (1 if abs(x - tx) > 4 else 0), "#8fd6ff")

# ---- fishing line from the rod tip to the hook in the fish's mouth, and the hook
x0, y0, x1, y1 = 22, 3, mx, my - 1
for i in range(0, 15):
    t = i / 14
    put(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), "#ffffff")
put(mx, my - 1, "#c8ccd4"); put(mx - 1, my, "#c8ccd4")

# ---- sparkles: it's a catch!
def star(x, y, c="#ffe070"):
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): put(x + dx, y + dy, c)
    put(x, y, "#ffffff")
star(42, 10); star(14, 21); star(41, 19, "#fff4b0")

out = sys.argv[1] if len(sys.argv) > 1 else "."
img.save(f"{out}/icon-45.png")
for size, name in [(180, "apple-touch-icon.png"), (360, "icon-360.png"), (90, "icon-90.png")]:
    img.resize((size, size), Image.NEAREST).save(f"{out}/{name}")
img.resize((48, 48), Image.NEAREST).save(f"{out}/favicon.png")
print("ok")
