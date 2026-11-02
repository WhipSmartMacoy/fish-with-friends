const LOOKS = {
  skin:      [["#f6d2b0", "Fair"], ["#f1c08f", "Light"], ["#d9a066", "Tan"], ["#b57a48", "Medium"], ["#8d5a33", "Brown"], ["#5e3a1f", "Deep"]],
  hairStyle: ["Short", "Long", "Spiky", "Bald"],
  hairColor: [["#2a221c", "Black"], ["#5a3a22", "Brown"], ["#8a3b1e", "Auburn"], ["#e3c16f", "Blonde"], ["#d86a2b", "Ginger"], ["#b8b2a8", "Gray"], ["#4f7bd6", "Blue"], ["#e07aa8", "Pink"]],
  hatStyle:  ["Helmet", "Cap", "Beanie", "Cowboy", "None"],
  hatColor:  [["#f2c43a", "Yellow"], ["#e8483e", "Red"], ["#4cbf58", "Green"], ["#4a8ee8", "Blue"], ["#f4efe2", "White"], ["#3a3448", "Black"], ["#a866e8", "Purple"], ["#b07a44", "Leather"]],
  shirt:     [["#4a8ee8", "Blue"], ["#f08a3a", "Orange"], ["#e8483e", "Red"], ["#4cbf58", "Green"], ["#a866e8", "Purple"], ["#f4efe2", "White"], ["#3a3448", "Black"], ["#f2cf3a", "Yellow"]],
  pants:     [["#3b4a6b", "Navy"], ["#4b6fa5", "Denim"], ["#6b4a2e", "Brown"], ["#2a2a2e", "Black"], ["#3f6b3a", "Green"], ["#77736e", "Gray"], ["#8f2f2a", "Red"]],
  pet:       ["None", "Dog", "Cat"],
  shoes:     [["#5a3a22", "Brown"], ["#1f1c1a", "Black"], ["#e8e4dc", "White"], ["#c23a30", "Red"], ["#3d6fb8", "Blue"], ["#b58a55", "Tan"]],
};
const LOOK_KEYS = Object.keys(LOOKS);
const DEFAULT_LOOKS = [
  { skin: 1, hairStyle: 0, hairColor: 1, hatStyle: 1, hatColor: 0, shirt: 0, pants: 0, shoes: 0, pet: 0 },
  { skin: 3, hairStyle: 1, hairColor: 0, hatStyle: 2, hatColor: 0, shirt: 1, pants: 1, shoes: 1, pet: 0 },
];
function cleanLook(l, seat = 0) {
  const out = { ...DEFAULT_LOOKS[seat] };
  if (l && typeof l === "object") {
    for (const k of LOOK_KEYS) {
      const v = Math.floor(Number(l[k]));
      if (v >= 0 && v < LOOKS[k].length) out[k] = v;
    }
  }
  return out;
}
function randomLook() {
  const l = {};
  for (const k of LOOK_KEYS) l[k] = Math.floor(Math.random() * LOOKS[k].length);
  return l;
}

// ---- ¾-view chibi miners, drawn natively on a 32x32 grid ----
// Letters are palette slots; "." is transparent. Outlines, shading and eye highlights are added by paint().
// S/s skin · p blush · E eyes · M mouth · R/r hair · Y/y hat · L lamp · W white · C/c shirt · O/o pants · B shoes
function newGrid(h = 32) { return Array.from({ length: h }, () => Array(32).fill(".")); }
function put(g, x, y, ch) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < g[0].length && y >= 0 && y < g.length) g[y][x] = ch; }
function rect(g, x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, ch); }
function ell(g, cx, cy, rx, ry, ch, clip) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
    if (dx * dx + dy * dy <= 1 && (!clip || clip(x, y))) put(g, x, y, ch);
  }
}
function spike(g, sx, baseY, h, lean, ch) {   // upward hair spike
  for (let r = 0; r < h; r++) { const w = Math.max(1, Math.round((h - r) * 0.8)); const cx = sx + lean * r / h; rect(g, Math.round(cx - w / 2), baseY - r, Math.round(cx + w / 2) - 1, baseY - r, ch); }
}
// A pointed lock of hair hanging down from (x, y0): `w` wide at the root, tapering to a tip,
// drifting `drift` pixels sideways by the end. Layering many of these gives anime-style hair.
function lock(g, x, y0, len, w, drift, ch, tip = "r") {
  for (let r = 0; r < len; r++) {
    const ww = Math.max(1, Math.round(w * (1 - r / len))), cx = x + drift * r / len;
    rect(g, Math.round(cx - ww / 2), y0 + r, Math.round(cx - ww / 2) + ww - 1, y0 + r, r >= len - 2 ? tip : ch);
  }
}

// Miners in the handheld tactics-RPG style: ~36px tall on a 32x40 grid, head about a third of
// their height, layered hair, collar, belt & buckle, gloves and tall boots.
// S/s skin · p blush · E eyes · M mouth · R/r/h hair · Y/y hat · L lamp · W white · C/c shirt
// O/o pants · B/b boots & gloves · k belt · G buckle
// frame: 0 = standing, 1–4 = walk (contact, pass, contact, pass)
const SPRITE_H = 40;
// pose: "walk" (uses frame), "raise"/"strike" (mining swing), "wave1"/"wave2", "hurt", "sit", "doze"
function chibiGrid(look, dir, frame, pose = "walk") {
  const g = newGrid(SPRITE_H);
  const hair = LOOKS.hairStyle[look.hairStyle], hat = LOOKS.hatStyle[look.hatStyle];
  const sitting = pose === "sit" || pose === "doze";
  const special = ["raise", "strike", "wave1", "wave2", "hurt"].includes(pose);
  const eyesShut = pose === "hurt" || pose === "doze";
  const b = sitting ? 3 : frame === 2 || frame === 4 ? -1 : 0;  // body bobs up on passing frames; lower when sitting
  const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0;       // +1: left leg forward
  const side = dir === "right", front = dir === "down", back = dir === "up";
  const arm = -stride;                                          // arms swing opposite the legs
  const hx = side ? 15 : 16;

  // ---------- long hair behind the body ----------
  if (hair === "Long" && front) {
    ell(g, 16, 18 + b, 9.5, 11, "R", (x, y) => y >= 10 + b && y <= 27 + b);
    for (const [x, d] of [[9, -1], [12, 0], [19, 0], [22, 1]]) lock(g, x, 25 + b, 5, 3, d, "R");
  }
  if (hair === "Long" && side) { rect(g, 7, 8 + b, 13, 24 + b, "R"); for (const x of [8, 11]) lock(g, x, 24 + b, 5, 3, -1, "R"); }

  // ---------- legs & tall boots ----------
  if (sitting) {                                                // sitting on the ground, knees forward
    rect(g, 12, 29 + b, 19, 33, "O");
    rect(g, 10, 33, 14, 37, "B"); rect(g, 17, 33, 21, 37, "B"); rect(g, 10, 33, 14, 33, "b"); rect(g, 17, 33, 21, 33, "b");
  } else if (!side) {
    const endL = 32 + stride, endR = 32 - stride;               // forward leg reaches lower (closer to camera)
    rect(g, 12, 29, 14, endL, "O"); rect(g, 17, 29, 19, endR, "O");
    for (const [x0, x1, e] of [[11, 14, endL], [17, 20, endR]]) { rect(g, x0, e + 1, x1, e + 5, "B"); rect(g, x0, e + 1, x1, e + 1, "b"); }
  } else {
    const off = stride * 2;
    for (const [x0, ch] of [[13 - off, "o"], [16 + off, "O"]]) {
      rect(g, x0, 29, x0 + 2, 32, ch); rect(g, x0, 33, x0 + 2, 37, "B"); rect(g, x0 + 3, 36, x0 + 3, 37, "B"); rect(g, x0, 33, x0 + 2, 33, "b");
    }
  }

  // ---------- torso, belt, arms ----------
  if (!side) {
    rect(g, 11, 18 + b, 20, 23 + b, "C"); rect(g, 12, 24 + b, 19, 26 + b, "C"); rect(g, 12, 26 + b, 19, 26 + b, "c");
    rect(g, 12, 27 + b, 19, 28 + b, "k");                                            // belt
    rect(g, 12, 29 + b, 19, 30, "O");                                                // hips
    if (front) {
      rect(g, 14, 18 + b, 17, 18 + b, "W"); put(g, 15, 19 + b, "S"); put(g, 16, 19 + b, "S");   // collar & neckline
      rect(g, 15, 27 + b, 16, 28 + b, "G");                                          // buckle
      rect(g, 15, 21 + b, 15, 25 + b, "c");                                          // shirt seam
    } else rect(g, 13, 18 + b, 18, 18 + b, "W");
    if (pose === "strike") {                                                         // both hands forward on the handle
      rect(g, 11, 20 + b, 12, 25 + b, "c"); rect(g, 19, 20 + b, 20, 25 + b, "c"); rect(g, 13, 25 + b, 18, 27 + b, "B");
    } else for (const [x0, a] of [[9, arm], [21, -arm]]) {
      if (special && pose !== "strike" && (pose !== "wave1" && pose !== "wave2" || x0 === 21)) continue;   // drawn later
      rect(g, x0, 19 + b + a, x0 + 1, 24 + b + a, "c");                              // sleeve
      rect(g, x0, 25 + b + a, x0 + 1, 27 + b + a, "B");                              // glove
    }
  } else {
    rect(g, 13, 18 + b, 19, 26 + b, "C"); rect(g, 13, 26 + b, 19, 26 + b, "c"); rect(g, 18, 18 + b, 19, 18 + b, "W");
    rect(g, 13, 27 + b, 19, 28 + b, "k"); put(g, 19, 27 + b, "G");
    rect(g, 13, 29 + b, 19, 30, "O");
    if (pose === "strike") { rect(g, 17, 20 + b, 21, 21 + b, "c"); rect(g, 22, 19 + b, 24, 22 + b, "B"); }
    else if (pose !== "raise" && pose !== "hurt") {
      const ax = 15 + arm * 2;
      rect(g, ax, 19 + b, ax + 1, 24 + b, "c"); rect(g, ax, 25 + b, ax + 1, 27 + b, "B");
    }
  }

  // ---------- neck & head ----------
  rect(g, 14, 16 + b, 17, 17 + b, "s");
  ell(g, hx, 10.5 + b, side ? 6.5 : 6.8, 6.8, "S");
  if (front) {   // diagonal ¾ face: turned slightly to the viewer's right, far eye foreshortened
    if (eyesShut) { rect(g, 13, 11 + b, 14, 11 + b, "r"); put(g, 19, 11 + b, "r"); }
    else { rect(g, 13, 10 + b, 14, 12 + b, "E"); rect(g, 19, 10 + b, 19, 12 + b, "E"); }
    rect(g, 12, 8 + b, 14, 8 + b, "r"); rect(g, 19, 8 + b, 20, 8 + b, "r");          // brows
    put(g, 18, 12 + b, "s"); put(g, 17, 14 + b, "M"); put(g, 18, 14 + b, "M");      // nose & mouth
    if (pose === "hurt" || pose === "wave1" || pose === "wave2") rect(g, 17, 14 + b, 18, 15 + b, "M");
    put(g, 12, 13 + b, "p"); put(g, 20, 13 + b, "p");
    rect(g, 22, 13 + b, 22, 15 + b, "s");                                          // far cheek in shadow
  } else if (side) {
    if (eyesShut) rect(g, 19, 11 + b, 20, 11 + b, "r"); else rect(g, 19, 10 + b, 20, 12 + b, "E");
    rect(g, 19, 8 + b, 20, 8 + b, "r");
    put(g, 22, 11 + b, "S");                                                        // nose
    put(g, 21, 14 + b, "M"); put(g, 19, 13 + b, "p");
    rect(g, 13, 10 + b, 14, 12 + b, "s");                                           // ear
  }

  // ---------- layered hair ----------
  if (hair !== "Bald") {
    if (front) {
      ell(g, 16, 8 + b, 8.6, 7, "R", (x, y) => y <= 9 + b);                         // crown volume
      const sideLen = hair === "Long" ? 16 : hair === "Spiky" ? 7 : 9;
      lock(g, 8, 6 + b, sideLen, 3, -1, "R"); lock(g, 24, 6 + b, sideLen, 3, 1, "R");     // locks framing the face
      lock(g, 10, 7 + b, 5, 3, -1, "R"); lock(g, 22, 7 + b, 5, 3, 1, "R");
      for (const [x, len, d] of [[11, 3, 0], [14, 2, 1], [17, 3, 0], [20, 2, -1]]) lock(g, x, 8 + b, len, 3, d, "R");  // bangs
      rect(g, 13, 3 + b, 13, 6 + b, "r"); rect(g, 18, 2 + b, 18, 5 + b, "r");      // strand lines
      rect(g, 10, 3 + b, 12, 3 + b, "h"); rect(g, 9, 4 + b, 9, 5 + b, "h"); rect(g, 19, 3 + b, 21, 3 + b, "h");   // shine
    } else if (back) {
      ell(g, 16, 9.5 + b, 8.6, 8.6, "R", (x, y) => y <= 15 + b);
      if (hair === "Long") { rect(g, 8, 10 + b, 23, 24 + b, "R"); for (let x = 9; x <= 22; x += 3) lock(g, x, 24 + b, 5, 3, 0, "R"); }
      else for (let x = 10; x <= 22; x += 3) lock(g, x, 14 + b, 4, 3, (x - 16) / 4, "R");   // nape
      for (const x of [12, 16, 20]) rect(g, x, 6 + b, x, 12 + b, "r");
      rect(g, 11, 3 + b, 15, 3 + b, "h"); rect(g, 10, 4 + b, 10, 5 + b, "h");
    } else {
      ell(g, 15, 8 + b, 8.6, 7, "R", (x, y) => y <= 9 + b);
      rect(g, 7, 7 + b, 13, 13 + b, "R");                                           // back of the head
      for (const [x, d] of [[8, -1], [11, -1]]) lock(g, x, 13 + b, hair === "Long" ? 4 : 5, 3, d, "R");
      for (const [x, len] of [[18, 3], [21, 3], [23, 2]]) lock(g, x, 8 + b, len, 3, 1, "R");   // bangs swept forward
      rect(g, 12, 3 + b, 12, 7 + b, "r"); rect(g, 9, 3 + b, 12, 3 + b, "h"); rect(g, 8, 4 + b, 8, 5 + b, "h");
    }
    if (hair === "Spiky" && hat === "None") {
      const xs = side ? [7, 11, 15, 19] : [9, 13, 18, 22];
      xs.forEach((sx, i) => spike(g, sx, 4 + b, 4 + (i % 2), side ? -2.5 : (i - 1.5) * 1.3, "R"));
    }
  }

  // ---------- hats ----------
  const top = lim => (x, y) => y <= lim + b;
  if (hat === "Helmet") {
    ell(g, hx, 6.5 + b, 8.8, 6.3, "Y", top(6));
    rect(g, 7, 6 + b, 24, 7 + b, "y");
    if (front) { rect(g, 13, 0, 18, 4 + b, "K"); rect(g, 14, 1 + b, 17, 3 + b, "L"); }
    if (side) { rect(g, 20, 1 + b, 24, 5 + b, "K"); rect(g, 21, 2 + b, 23, 4 + b, "L"); }
  } else if (hat === "Cap") {
    ell(g, hx, 6.5 + b, 8.3, 5.8, "Y", top(6));
    if (front) ell(g, 16, 7.5 + b, 8.8, 2.1, "y", (x, y) => y >= 7 + b);
    else if (side) rect(g, 18, 6 + b, 26, 7 + b, "y");
    else rect(g, 9, 6 + b, 22, 6 + b, "y");
    put(g, hx, 0.6 + b, "y");
  } else if (hat === "Beanie") {
    ell(g, hx, 7 + b, 8.8, 6.8, "Y", top(7));
    rect(g, 7, 6 + b, 24, 8 + b, "y");
    for (let x = 8; x <= 23; x += 2) rect(g, x, 6 + b, x, 8 + b, "Y");
    ell(g, side ? 14 : 16, 1 + b, 2.3, 2, "W");
  } else if (hat === "Cowboy") {
    rect(g, hx - 4, 0, hx + 3, 5 + b, "Y"); put(g, hx - 1, 0, "."); put(g, hx, 0, ".");
    rect(g, hx - 4, 4 + b, hx + 3, 5 + b, "y");
    ell(g, hx, 6.5 + b, 13, 2.3, "Y");
    rect(g, hx - 10, 7 + b, hx + 10, 7 + b, "y");
  }

  // ---------- arms that go over the head / face ----------
  if (pose === "raise") {
    if (side) { rect(g, 11, 11 + b, 12, 18 + b, "c"); rect(g, 10, 7 + b, 12, 10 + b, "B"); }
    else { rect(g, 8, 11 + b, 9, 18 + b, "c"); rect(g, 22, 11 + b, 23, 18 + b, "c"); rect(g, 8, 7 + b, 10, 10 + b, "B"); rect(g, 21, 7 + b, 23, 10 + b, "B"); }
  } else if (pose === "wave1" || pose === "wave2") {
    const wx = pose === "wave1" ? 22 : 24;
    rect(g, 21, 13 + b, 22, 19 + b, "c"); rect(g, wx, 9 + b, wx + 1, 12 + b, "B");
    rect(g, wx - 1, 12 + b, wx, 13 + b, "c");
  } else if (pose === "hurt") {
    if (side) { rect(g, 17, 17 + b, 18, 20 + b, "c"); rect(g, 19, 14 + b, 20, 16 + b, "B"); }
    else { rect(g, 9, 18 + b, 10, 21 + b, "c"); rect(g, 21, 18 + b, 22, 21 + b, "c"); rect(g, 10, 15 + b, 12, 17 + b, "B"); rect(g, 19, 15 + b, 21, 17 + b, "B"); }
  }
  return g.map(r => r.join(""));
}

const skinShade = skin => { const [r, g, b] = rgbOf(skin), t = 0.28, to = [150, 80, 96]; return `rgb(${[r, g, b].map((v, k) => Math.round(v * (1 - t) + to[k] * t)).join(",")})`; };
const blush = skin => { const [r, g, b] = rgbOf(skin), pk = [255, 120, 140], t = 0.3; return `rgb(${[r, g, b].map((v, k) => Math.round(v * (1 - t) + pk[k] * t)).join(",")})`; };
function lookPalette(look) {
  const c = (k) => LOOKS[k][look[k]][0];
  return {
    K: "#2a1814", E: "#2a1c30", L: "#fff6c0",
    S: c("skin"), s: skinShade(c("skin")), p: blush(c("skin")),
    R: c("hairColor"), r: ramp(c("hairColor"), -1), h: ramp(c("hairColor"), 2),
    Y: c("hatColor"), y: ramp(c("hatColor"), -1),
    C: c("shirt"), c: ramp(c("shirt"), -1),
    O: c("pants"), o: ramp(c("pants"), -1),
    B: c("shoes"), b: ramp(c("shoes"), 2), k: "#6a4024", G: "#ffd860", M: "#9a4a46", W: "#f4f0e8",
  };
}

const mirror = rows => rows.map(r => [...r.padEnd(16, ".")].reverse().join(""));
const rot90 = rows => rows[0].split("").map((_, c) => rows.map(r => r[c]).reverse().join(""));

function mkCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
// 32-bit look: sprites are authored on a 16 grid, then upscaled to 32x32 with Scale2x
// (smooths diagonals), outlines are thinned back to 1px, and a light pass adds a top-left
// highlight and bottom-right shadow to every coloured region.
const K = 4 / 3;         // world units → device pixels (48-unit tile = 64 device px = 64 art pixels)
const HD_PX = 2;         // device pixels per art pixel (crisp 32x32 sprites shown at 2x, GBA-style)
const UPSCALE_PASSES = 1; // 16 → 32
const OPAQUE_NO_SHADE = new Set(["K", "E", "L", "M", "."]);
function scale2x(grid) {
  const h = grid.length, w = grid[0].length, at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? "." : grid[y][x];
  const out = Array.from({ length: h * 2 }, () => new Array(w * 2));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    out[2 * y][2 * x]         = C === A && C !== D && A !== B ? A : P;
    out[2 * y][2 * x + 1]     = A === B && A !== C && B !== D ? B : P;
    out[2 * y + 1][2 * x]     = D === C && D !== B && C !== A ? C : P;
    out[2 * y + 1][2 * x + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return out;
}
function thinOutline(g) {
  const h = g.length, w = g[0].length, at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? "." : g[y][x];
  const colored = c => c !== "." && c !== "K";
  return g.map((row, y) => row.map((ch, x) => {
    if (ch !== "K") return ch;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]])
      if (at(x + dx, y + dy) === "." && at(x - dx, y - dy) === "K" && colored(at(x - 2 * dx, y - 2 * dy))) return ".";
    return ch;
  }));
}
// Strip the upscaled outer outline (it gets fuzzy) and draw a fresh, clean 1px outline
// around the coloured shape. Interior lines between colours are kept.
function reoutline(g) {
  const h = g.length, w = g[0].length;
  let cur = g.map(r => r.slice());
  for (let changed = true; changed;) {
    changed = false;
    const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? "." : cur[y][x];
    const next = cur.map((row, y) => row.map((ch, x) => {
      if (ch === "K" && [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)].includes(".")) { changed = true; return "."; }
      return ch;
    }));
    cur = next;
  }
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? "." : cur[y][x];
  return cur.map((row, y) => row.map((ch, x) =>
    ch === "." && [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)].some(c => c !== ".") ? "K" : ch));
}
// Remove outline stubs left by upscaling: an outline pixel touching at most one other
// solid pixel (4-way) and nothing coloured is a stray speck.
function despeckle(g) {
  const h = g.length, w = g[0].length, at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? "." : g[y][x];
  return g.map((row, y) => row.map((ch, x) => {
    if (ch !== "K") return ch;
    const n = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)];
    const solid = n.filter(c => c !== ".").length, colored = n.some(c => c !== "." && c !== "K");
    return (!colored && solid <= 1) ? "." : ch;
  }));
}
const shadeCache = {};
const shadeOf = (hex, f) => shadeCache[hex + f] || (shadeCache[hex + f] = hex.startsWith("#") ? shade(hex, f) : hex);
// Handheld-tactics-RPG look: crisp 32x32 sprites, coloured "sel-out" outlines (each outline
// pixel is a deep shade of the colour it wraps, not flat black), soft 3-tone shading lit from
// the top-left, and glossy eyes with a highlight.
const rgbOf = c => c.startsWith("#") ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).slice(0, 3).map(Number);
const OUTLINE_INK = [34, 20, 40];
// Hue-shifted ramps (the heart of the handheld tactics-RPG look): highlights warm toward
// yellow, shadows cool toward blue-violet and gain saturation — even greys get bluish shadows.
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255));
}
function towardHue(h, target, deg) {
  let d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), deg) + 360) % 360;
}
const rampCache = {};
function ramp(c, step) {
  const key = c + step;
  if (rampCache[key]) return rampCache[key];
  let [h, s, l] = rgb2hsl(rgbOf(c));
  const grey = s < 0.1;
  if (step > 0) { l += 0.085 * step; s = Math.max(0, s - 0.02 * step); if (!grey) h = towardHue(h, 55, 7 * step); }
  else if (step < 0) {
    const k = -step;
    l -= 0.095 * k; s = grey ? Math.min(1, s + 0.07 * k) : s > 0.45 ? s * (1 - 0.11 * k) : Math.min(1, s + 0.04 * k);
    h = grey ? 235 : towardHue(h, 255, 7 * k);
  }
  l = Math.max(0.04, Math.min(0.97, l));
  const [r, g, b] = hsl2rgb(h, s, l);
  return (rampCache[key] = `rgb(${r},${g},${b})`);
}
function seloutColor(base, f, t = 0.4) {
  const [r, g, b] = rgbOf(base);
  const mix = (v, k) => Math.round(v * f * (1 - t) + OUTLINE_INK[k] * t);
  return `rgb(${mix(r, 0)},${mix(g, 1)},${mix(b, 2)})`;
}
function paint(rows, pal, opts = {}) {
  const w = Math.max(...rows.map(r => r.length));
  let g = rows.map(r => [...r.padEnd(w, ".")]);
  for (let i = 0; i < (opts.passes ?? UPSCALE_PASSES); i++) g = scale2x(g);
  if (!opts.rawOutline) g = reoutline(g);
  const h2 = g.length, w2 = g[0].length, at = (x, y) => (y < 0 || y >= h2 || x < 0 || x >= w2) ? "." : g[y][x];
  const edge = c => c === "." || c === "K";
  const fill = c => c !== "." && c !== "K" && pal[c];
  const c = mkCanvas(w2 * HD_PX, h2 * HD_PX), ctx2 = c.getContext("2d");
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const ch = g[y][x];
    if (ch === "." || !pal[ch]) continue;
    let col = pal[ch];
    if (ch === "K") {
      // sel-out: take the colour of the fill this outline wraps; bottom/right edges go darker
      const below = [[0, -1], [-1, 0], [0, 1], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]
        .map(([dx, dy]) => ({ c: at(x + dx, y + dy), dx, dy })).find(n => fill(n.c) && n.c !== "E");
      if (below && !opts.rawOutline) {
        const lit = below.dy > 0 || below.dx > 0;      // fill is below/right → this is a top/left edge
        col = (below.c === "S" || below.c === "p") && pal.s
          ? seloutColor(pal.s, lit ? 0.72 : 0.6, 0.45)                 // skin: warm brown outline
          : seloutColor(ramp(pal[below.c], lit ? -2 : -3), 1, lit ? 0.2 : 0.35);
      }
    } else if (ch === "E") {
      // glossy eyes: highlight on the top-left pixel of each eye
      if (at(x, y - 1) !== "E" && at(x - 1, y) !== "E") col = "#fff6e6";
      else if (at(x, y + 1) !== "E") col = "#4a3a6a";
    } else if (!OPAQUE_NO_SHADE.has(ch)) {
      let st = 0;
      if (edge(at(x, y - 1)) || edge(at(x - 1, y))) st = 1;
      else if (edge(at(x, y + 1)) || edge(at(x + 1, y))) st = -2;
      else if (edge(at(x, y + 2)) || edge(at(x + 2, y))) st = -1;
      if (st < 0 && (ch === "S" || ch === "p") && pal.s) col = pal.s;   // skin: one soft rose-brown shadow
      else if (st) col = ramp(pal[ch], st);
    }
    ctx2.fillStyle = col;
    ctx2.fillRect(x * HD_PX, y * HD_PX, HD_PX, HD_PX);
  }
  return c;
}
// Draw an HD sprite at world-unit position (it carries 4/3 device px per unit).
const drawSprite = (img, x, y, w, h) => ctx.drawImage(img, x, y, w ?? img.width / K, h ?? img.height / K);
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

const spriteCache = {};
function lookSprites(look) {
  const key = JSON.stringify(look);
  if (spriteCache[key]) return spriteCache[key];
  const pal = lookPalette(look), out = {};
  const P = rows => paint(rows, pal, { passes: 0 });
  for (const dir of ["down", "up", "right"]) {
    const grids = {
      stand: chibiGrid(look, dir, 0), idle2: chibiGrid(look, dir, 2),
      walk: [1, 2, 3, 4].map(f => chibiGrid(look, dir, f)),
      raise: chibiGrid(look, dir, 0, "raise"), strike: chibiGrid(look, dir, 0, "strike"),
    };
    const build = m => ({ stand: P(m(grids.stand)), idle: [P(m(grids.stand)), P(m(grids.idle2))], walk: grids.walk.map(f => P(m(f))),
                          raise: P(m(grids.raise)), strike: P(m(grids.strike)) });
    out[dir] = build(x => x);
    if (dir === "right") out.left = build(mirror32);
  }
  out.extra = {
    wave: [P(chibiGrid(look, "down", 0, "wave1")), P(chibiGrid(look, "down", 0, "wave2"))],
    hurt: P(chibiGrid(look, "down", 0, "hurt")),
    sit: P(chibiGrid(look, "down", 0, "sit")),
    doze: P(chibiGrid(look, "down", 0, "doze")),
  };
  return (spriteCache[key] = out);
}
const mirror32 = rows => rows.map(r => [...r].reverse().join(""));
function playerSprites(seat) { return lookSprites(cleanLook(state.players[seat].look, seat)); }

