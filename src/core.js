// ================= Version & fresh assets =================
// BUILD changes with every release. Asset URLs carry it so phones can't keep showing stale images,
// and on load we check whether the server has a newer build than the one running.
const BUILD = "2026.11.02-1000";
const withV = url => /^(https?:|data:|blob:)/.test(url) ? url : url + (url.includes("?") ? "&" : "?") + "v=" + BUILD;
document.querySelectorAll(".build-tag").forEach(el => el.textContent = BUILD);

// ---- Screen fit (from Mine with friends): detect the phone from its screen size and pick a layout profile
function detectDevice() {
  const w = Math.min(screen.width, screen.height), h = Math.max(screen.width, screen.height);
  const phone = /iPhone/.test(navigator.userAgent) || matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (phone && w === 420 && h === 912) return "air";            // iPhone Air
  if (phone && w === 393 && h === 852) return "15pro";          // iPhone 15 Pro (also 14 Pro, 15, 16)
  return "standard";
}
function applyFit() { document.documentElement.dataset.device = detectDevice(); fitStage(); }
// Size the square game view so the bars, controls and chat all fit on screen — whatever the browser's toolbars leave us.
function fitStage() {
  const pa = document.querySelector(".playarea"), st = document.getElementById("stage");
  if (!pa || !st) return;
  const portrait = getComputedStyle(pa).gridTemplateAreas.includes("pet");
  if (!portrait || !pa.clientHeight) { document.documentElement.style.removeProperty("--stage"); delete document.documentElement.dataset.short; return; }
  const short = pa.clientHeight < 560 + (document.documentElement.dataset.short ? 24 : 0);   // a little hysteresis
  if (short !== !!document.documentElement.dataset.short) {
    if (short) document.documentElement.dataset.short = "1"; else delete document.documentElement.dataset.short;
  }
  const cs = getComputedStyle(document.documentElement), num = v => parseFloat(cs.getPropertyValue(v)) || 0;
  const controls = Math.max(num("--joy"), num("--act")), gap = num("--gap");
  const room = pa.clientHeight - controls - num("--chat-min") - gap * 2;
  const size = Math.max(200, Math.min(pa.clientWidth, room));
  document.documentElement.style.setProperty("--stage", size + "px");
}
addEventListener("resize", () => fitStage());
addEventListener("orientationchange", () => setTimeout(fitStage, 300));

async function checkForUpdate() {
  try {
    const res = await fetch(location.pathname + "?check=" + Date.now(), { cache: "no-store" });
    const m = (await res.text()).match(/const BUILD = "([^"]+)"/);
    if (!m || m[1] === BUILD) return;
    if (document.body.classList.contains("ingame")) toast("A new version of the game is out — reload when you finish this session.", "ok", 9000);
    else { const q = new URLSearchParams(location.search); q.set("v", m[1]); location.replace(location.pathname + "?" + q.toString()); }
  } catch {}
}

// ================= Helpers =================
const PEER_PREFIX = "fish-with-friends-";
const PREFS_KEY = "fwf-prefs", LOOK_KEY = "fwf-look", RECENT_KEY = "fwf-recent";
const saveKey = code => "fwf-save-" + code;
const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {   // smooth value noise in [0, 1)
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sm = t => t * t * (3 - 2 * t), u = sm(fx), v = sm(fy);
  const a = hash2(x0, y0, s), b = hash2(x0 + 1, y0, s), c = hash2(x0, y0 + 1, s), d = hash2(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

// ================= The world =================
// One big hand-shaped map (75 × 75 tiles), generated the same way on both devices so only players travel the wire.
const TS = 48;                 // world units per tile (the character art is 48 × 60 units)
const MW = 75, MH = 75, CH = 15;
const T = { GRASS: 0, SAND: 1, PATH: 2, DOCK: 3, BRIDGE: 4, TREE: 5, BUILD: 6, FLOWER: 7, ROCK: 8, POND: 10, RIVER: 11, LAKE: 12, OCEAN: 13 };
const WATER_NAMES = { 10: "Pond", 11: "River", 12: "Lake", 13: "Sea" };
const WATER_KEYS = { 10: "pond", 11: "river", 12: "lake", 13: "sea" };
const tiles = new Uint8Array(MW * MH);
const under = new Uint8Array(MW * MH);   // water beneath docks and bridges
const depth = new Uint8Array(MW * MH);   // tiles to the nearest shore
const buildAt = new Int8Array(MW * MH).fill(-1);
const idx = (x, y) => y * MW + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const tileAt = (x, y) => inMap(x, y) ? tiles[idx(x, y)] : T.TREE;
const isWater = t => t >= 10;
const waterAt = (x, y) => isWater(tileAt(x, y));
const walkTile = t => t === T.GRASS || t === T.SAND || t === T.PATH || t === T.DOCK || t === T.BRIDGE || t === T.FLOWER;

const BUILDINGS = [
  { id: "home",   name: "Your cottage",  x: 7,  y: 26, w: 4, h: 3, sign: "🏠", act: "📖<br>Journal", roof: "#c24a3a" },
  { id: "tackle", name: "Tackle Shop",   x: 13, y: 26, w: 4, h: 3, sign: "🎣", act: "🛒<br>Shop",    roof: "#3a6ac2" },
  { id: "market", name: "Fish Market",   x: 19, y: 26, w: 4, h: 3, sign: "🐟", act: "💰<br>Sell",    roof: "#3aa27a", stall: true },
];
const SPAWNS = [{ x: 9.5, y: 30.5 }, { x: 11.5, y: 30.5 }];
const SHOPKEEPS = {
  tackle: { name: "Reel Rita", look: { skin: 2, hairStyle: 1, hairColor: 4, hatStyle: 1, hatColor: 3, shirt: 3, pants: 1, shoes: 0, pet: 0 } },
  market: { name: "Monger Moe", look: { skin: 4, hairStyle: 3, hairColor: 5, hatStyle: 2, hatColor: 4, shirt: 5, pants: 0, shoes: 1, pet: 0 } },
};

function genWorld() {
  const set = (x, y, t) => { if (inMap(x, y)) tiles[idx(x, y)] = t; };
  const blob = (cx, cy, rx, ry, t, wob, seed, keep) => {
    for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
      if (dx * dx + dy * dy < 1 + wob * (vnoise(x * .25, y * .25, seed) - .5) && (!keep || keep(tileAt(x, y)))) set(x, y, t);
    }
  };
  tiles.fill(T.GRASS);
  // the sea along the east edge, with a sandy beach
  for (let y = 0; y < MH; y++) {
    const coast = Math.round(64 + 3 * (vnoise(0, y * .12, 7) - .5) * 2);
    for (let x = coast - 3; x < MW; x++) set(x, y, x >= coast ? T.OCEAN : T.SAND);
  }
  // the lake, with a little island
  blob(42, 45, 11, 8.5, T.LAKE, .5, 3);
  blob(46, 47, 1.8, 1.4, T.GRASS, .2, 4);
  // two ponds: one by home, one in the north woods
  blob(13.5, 42, 3.4, 2.8, T.POND, .3, 5);
  blob(15, 11, 2.8, 2.4, T.POND, .3, 6);
  // the river: down from the north edge into the lake, and out of the lake to the sea
  const carve = (pts, w) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        for (let yy = Math.floor(y - w); yy <= y + w; yy++) for (let xx = Math.floor(x - w); xx <= x + w; xx++)
          if (Math.hypot(xx + .5 - x, yy + .5 - y) <= w && tileAt(xx, yy) !== T.LAKE && tileAt(xx, yy) !== T.OCEAN) set(xx, yy, T.RIVER);
      }
    }
  };
  carve([[31, -1], [33, 8], [30, 16], [34, 24], [36, 31], [38, 38]], 1.35);
  carve([[52, 50], [55, 55], [58, 57], [62, 60], [66, 61]], 1.35);
  // roads (brick paths). Over the river they become bridges, over still water docks.
  const road = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n), t = tileAt(x, y);
      if (t === T.RIVER) { under[idx(x, y)] = t; set(x, y, T.BRIDGE); }
      else if (!isWater(t) && t !== T.SAND) set(x, y, T.PATH);
      else if (t === T.SAND) set(x, y, T.PATH);
    }
  };
  road(4, 30, 61, 30);              // main road from the village to the beach
  road(29, 30, 29, 44);             // down to the lake dock
  road(13, 30, 13, 37);             // to the home pond
  road(15, 30, 15, 15);             // up to the woods pond
  road(33, 30, 33, 3);              // north along the river
  // docks: one into the lake, a long pier into the sea, a little one on the home pond
  const dock = (x, y, dx, dy, n) => {
    for (let k = 0; k < n; k++) { const xx = x + dx * k, yy = y + dy * k, t = tileAt(xx, yy); if (isWater(t)) under[idx(xx, yy)] = t; set(xx, yy, T.DOCK); }
  };
  let lx = 29; while (!waterAt(lx, 44) && lx < 45) lx++;
  dock(lx, 44, 1, 0, 5);
  let sx = 55; while (!waterAt(sx, 30) && sx < MW - 1) sx++;
  dock(sx - 1, 30, 1, 0, 8);
  let py = 37; while (!waterAt(13, py) && py < 45) py++;
  dock(13, py, 0, 1, 2);
  // buildings
  BUILDINGS.forEach((b, bi) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { set(x, y, T.BUILD); buildAt[idx(x, y)] = bi; } });
  for (let x = 6; x <= 23; x++) if (tileAt(x, 29) === T.GRASS) set(x, 29, T.PATH);   // a walk in front of the shops
  // trees: thick woods to the north and south, scattered elsewhere; never on a shore, so every bank is fishable
  const nearWater = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (waterAt(x + dx, y + dy) || [T.DOCK, T.BRIDGE].includes(tileAt(x + dx, y + dy))) return true; return false; };
  const nearRoad = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tileAt(x + dx, y + dy); if (t === T.PATH || t === T.BUILD) return true; } return false; };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (tileAt(x, y) !== T.GRASS) continue;
    const edge = x === 0 || y === 0 || y === MH - 1;
    if (edge) { set(x, y, T.TREE); continue; }
    if (nearWater(x, y) || nearRoad(x, y)) continue;
    if (x >= 5 && x <= 25 && y >= 24 && y <= 46) continue;                     // keep the village open
    const woods = (y < 22 || y > 56) ? .48 : .66;
    const n = vnoise(x * .18, y * .18, 11);
    if (n > woods && hash2(x, y, 12) < .62) set(x, y, T.TREE);
    else if (hash2(x, y, 13) < .012) set(x, y, T.ROCK);
    else if (hash2(x, y, 14) < .05) set(x, y, T.FLOWER);
  }
  // water depth: distance (in tiles) to the nearest bank
  const q = [];
  for (let i = 0; i < tiles.length; i++) { if (isWater(tiles[i])) depth[i] = 255; else { depth[i] = 0; q.push(i); } }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % MW, y = (i / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!inMap(x + dx, y + dy)) continue;
      const j = idx(x + dx, y + dy);
      if (depth[j] === 255) { depth[j] = depth[i] + 1; q.push(j); }
    }
  }
  for (let i = 0; i < tiles.length; i++) if (depth[i] === 255) depth[i] = 9;
}
genWorld();
const depthAt = (x, y) => inMap(x, y) ? depth[idx(x, y)] : 0;
// Ripply "hot spots" move every few minutes; both players see the same ones (they're picked from the clock).
const HOT_MS = 3 * 60 * 1000;
const hotCache = new Map();
function hotSpots(t) {
  const win = Math.floor(t / HOT_MS);
  if (hotCache.has(win)) return hotCache.get(win);
  const out = [];
  for (const kind of [T.POND, T.RIVER, T.LAKE, T.OCEAN]) {
    const cands = [];
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === kind) cands.push(i);
    const n = kind === T.POND ? 1 : 2;
    for (let k = 0; k < n; k++) { const i = cands[Math.floor(hash2(win, kind, k + 50) * cands.length)]; out.push({ x: i % MW, y: (i / MW) | 0 }); }
  }
  hotCache.clear(); hotCache.set(win, out);
  return out;
}
const nearHot = (x, y, t) => hotSpots(t).some(h => Math.abs(h.x - x) <= 1 && Math.abs(h.y - y) <= 1);

// ================= Time of day =================
// One in-game day lasts 12 real minutes. Both devices read the host's clock.
const DAY_MS = 12 * 60 * 1000;
let clockSkew = 0;   // guest: our clock minus the host's
const hostNow = () => Date.now() - clockSkew;
const hourAt = t => (6 + (t % DAY_MS) / DAY_MS * 24) % 24;
const isNight = t => { const h = hourAt(t); return h >= 20 || h < 5; };
function clockText(t) {
  const h = hourAt(t), hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10;
  const icons = ["🕛", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚"];
  return `${isNight(t) ? "🌙" : icons[hh % 12]} ${hh}:${String(mm).padStart(2, "0")}`;
}

// ================= Fish =================
// w = how common · d = fight difficulty (1–10) · lvl = fishing level needed · kg = weight range · time: any/day/night
// shape: std / long / flat (pixel art) or an emoji · col = [body, belly, fin, stripe]
const FISH = [
  // Pond
  { id: "minnow",   name: "Minnow",        water: ["pond", "river"], lvl: 1, w: 40, d: 1, price: 4,   kg: [.01, .06], shape: "std",  col: ["#a8b8a0", "#e8ecd8", "#7a8a70", "#8a9a80"] },
  { id: "sunfish",  name: "Sunfish",       water: ["pond"],          lvl: 1, w: 30, d: 2, price: 10,  kg: [.1, .4],   shape: "flat", col: ["#e8a040", "#ffe070", "#c06a28", "#4a8a8a"] },
  { id: "bluegill", name: "Bluegill",      water: ["pond", "lake"],  lvl: 2, w: 24, d: 2, price: 14,  kg: [.1, .6],   shape: "flat", col: ["#5a7ab0", "#f0c070", "#3a4a80", "#2a3a6a"] },
  { id: "carp",     name: "Carp",          water: ["pond", "lake"],  lvl: 3, w: 16, d: 4, price: 28,  kg: [1, 8],     shape: "std",  col: ["#b08a40", "#e8d090", "#8a6a2a", "#9a7a38"] },
  { id: "koi",      name: "Koi",           water: ["pond"],          lvl: 5, w: 6,  d: 5, price: 90,  kg: [1, 5],     shape: "std",  col: ["#f4f0e8", "#ffffff", "#e8483e", "#e8483e"], time: "day" },
  { id: "goldkoi",  name: "Golden Koi",    water: ["pond"],          lvl: 8, w: 1,  d: 8, price: 650, kg: [2, 6],     shape: "std",  col: ["#ffd040", "#fff0a0", "#e89a20", "#fff4c0"], legend: true },
  // River
  { id: "chub",     name: "Chub",          water: ["river"],         lvl: 1, w: 34, d: 2, price: 9,   kg: [.2, 1],    shape: "std",  col: ["#8a9aa0", "#dce4e0", "#c05a3a", "#6a7a80"] },
  { id: "trout",    name: "Rainbow Trout", water: ["river", "lake"], lvl: 2, w: 26, d: 3, price: 24,  kg: [.3, 2.5],  shape: "std",  col: ["#7aa070", "#f0e0d0", "#5a7a50", "#e87a8a"] },
  { id: "salmon",   name: "Salmon",        water: ["river", "sea"],  lvl: 4, w: 14, d: 5, price: 55,  kg: [2, 9],     shape: "std",  col: ["#c87060", "#f0d0c0", "#8a4a40", "#a85a50"] },
  { id: "eel",      name: "Eel",           water: ["river", "pond"], lvl: 4, w: 10, d: 6, price: 48,  kg: [.5, 3],    shape: "long", col: ["#4a5a3a", "#8a9a6a", "#3a4a2a", "#5a6a4a"], time: "night" },
  { id: "pike",     name: "Pike",          water: ["river", "lake"], lvl: 5, w: 11, d: 6, price: 70,  kg: [1, 12],    shape: "long", col: ["#5a8a4a", "#e0e8c0", "#3a6a3a", "#c0d890"] },
  { id: "sturgeon", name: "Sturgeon",      water: ["river"],         lvl: 7, w: 4,  d: 8, price: 220, kg: [10, 60],   shape: "long", col: ["#6a6a7a", "#c8c8d0", "#4a4a5a", "#8a8a9a"], deep: true },
  { id: "riverking",name: "River King",    water: ["river"],         lvl: 9, w: 1,  d: 9, price: 900, kg: [15, 40],   shape: "std",  col: ["#3a8ac0", "#e0f4ff", "#ffd040", "#ffd040"], legend: true },
  // Lake
  { id: "perch",    name: "Perch",         water: ["lake"],          lvl: 1, w: 34, d: 2, price: 11,  kg: [.1, .8],   shape: "std",  col: ["#c8b040", "#f0e8b0", "#e8603a", "#4a5a2a"] },
  { id: "bass",     name: "Largemouth Bass", water: ["lake", "pond"],lvl: 2, w: 24, d: 4, price: 34,  kg: [.5, 4.5],  shape: "std",  col: ["#5a8a3a", "#e8e8c0", "#3a6a2a", "#2a4a1a"] },
  { id: "catfish",  name: "Catfish",       water: ["lake", "river"], lvl: 3, w: 16, d: 5, price: 44,  kg: [1, 15],    shape: "std",  col: ["#6a6050", "#c8c0a8", "#4a4038", "#5a5040"], time: "night" },
  { id: "walleye",  name: "Walleye",       water: ["lake"],          lvl: 4, w: 13, d: 5, price: 50,  kg: [1, 6],     shape: "long", col: ["#a89a50", "#f0f0d8", "#7a6a30", "#6a5a28"] },
  { id: "muskie",   name: "Muskie",        water: ["lake"],          lvl: 6, w: 6,  d: 7, price: 160, kg: [5, 25],    shape: "long", col: ["#8a9a5a", "#e8e8c8", "#5a6a3a", "#4a5a2a"], deep: true },
  { id: "whiskers", name: "Old Whiskers",  water: ["lake"],          lvl: 9, w: 1,  d: 9, price: 1000,kg: [30, 80],   shape: "std",  col: ["#3a3430", "#a89a88", "#ffd040", "#6a5a50"], legend: true, deep: true, time: "night" },
  // Sea
  { id: "sardine",  name: "Sardine",       water: ["sea"],           lvl: 1, w: 40, d: 1, price: 5,   kg: [.05, .2],  shape: "std",  col: ["#7a9ac0", "#e8f0f8", "#5a7aa0", "#3a5a8a"] },
  { id: "mackerel", name: "Mackerel",      water: ["sea"],           lvl: 2, w: 28, d: 3, price: 18,  kg: [.3, 1.5],  shape: "std",  col: ["#3a8a8a", "#f0f4f0", "#2a5a6a", "#1a3a4a"] },
  { id: "snapper",  name: "Red Snapper",   water: ["sea"],           lvl: 3, w: 20, d: 4, price: 40,  kg: [1, 8],     shape: "std",  col: ["#e05a5a", "#f8c8c0", "#b03a3a", "#f08a7a"] },
  { id: "squid",    name: "Squid",         water: ["sea"],           lvl: 4, w: 12, d: 5, price: 45,  kg: [.5, 3],    shape: "🦑", time: "night" },
  { id: "octopus",  name: "Octopus",       water: ["sea"],           lvl: 5, w: 7,  d: 6, price: 80,  kg: [2, 12],    shape: "🐙" },
  { id: "tuna",     name: "Bluefin Tuna",  water: ["sea"],           lvl: 6, w: 7,  d: 7, price: 150, kg: [20, 120],  shape: "std",  col: ["#2a4a8a", "#d8e0f0", "#ffd040", "#1a2a5a"], deep: true },
  { id: "sword",    name: "Swordfish",     water: ["sea"],           lvl: 8, w: 3,  d: 8, price: 300, kg: [40, 180],  shape: "long", col: ["#4a5a8a", "#d0d8e8", "#2a3a6a", "#3a4a7a"], deep: true },
  { id: "moonfish", name: "Moonfish",      water: ["sea"],           lvl: 10,w: 1,  d: 10,price: 1500,kg: [40, 120],  shape: "flat", col: ["#c8d0f0", "#ffffff", "#8a9ae0", "#ffe8a0"], legend: true, time: "night", deep: true },
];
const JUNK = [
  { id: "boot",    name: "Old Boot",       w: 5, price: 1, kg: [.4, 1], shape: "👢", junk: true },
  { id: "can",     name: "Tin Can",        w: 5, price: 1, kg: [.05, .2], shape: "🥫", junk: true },
  { id: "weed",    name: "Seaweed",        w: 4, price: 2, kg: [.1, .5], shape: "🌿", junk: true },
  { id: "chest",   name: "Treasure Chest", w: 1.2, price: 0, kg: [3, 9], shape: "🧰", junk: true, treasure: true },
];
const CATCH = Object.fromEntries([...FISH, ...JUNK].map(f => [f.id, f]));
const RODS = [
  { name: "Twig Rod",       reach: 3, price: 0,    power: 0, icon: "🪵" },
  { name: "Bamboo Rod",     reach: 4, price: 200,  power: 1, icon: "🎋" },
  { name: "Fiberglass Rod", reach: 5, price: 800,  power: 2, icon: "🎣" },
  { name: "Carbon Rod",     reach: 6, price: 2500, power: 3, icon: "⚫" },
  { name: "Golden Rod",     reach: 7, price: 8000, power: 4, icon: "🌟" },
];
const BAITS = {
  worms: { name: "Worms",       icon: "🪱", pack: 10, price: 20,  desc: "Fish bite much sooner." },
  lure:  { name: "Shiny Lure",  icon: "✨", pack: 10, price: 60,  desc: "Rare fish are twice as likely." },
  glow:  { name: "Glow Bait",   icon: "💡", pack: 10, price: 100, desc: "Great at night and in deep water: rarer fish, quicker bites." },
};
const COOLERS = [{ size: 10, price: 0 }, { size: 16, price: 300 }, { size: 24, price: 900 }, { size: 32, price: 2400 }, { size: 40, price: 6000 }];
const XP_AT = [0, 30, 80, 160, 280, 450, 700, 1050, 1500, 2100];   // XP needed for levels 1..10
const levelOf = xp => { let l = 1; while (l < 10 && xp >= XP_AT[l]) l++; return l; };
const PET_PERKS = { None: "", Dog: "🐶 Barks when a fish bites — you get a little longer to hook it.", Cat: "🐱 Fish lover — your catches come in a bit heavier." };

function sizeLabel(f, kg) {
  const t = (kg - f.kg[0]) / (f.kg[1] - f.kg[0] || 1);
  return t > .9 ? "⭐ Trophy" : t > .65 ? "Big" : t < .2 ? "Small" : "";
}
function priceOf(item) {
  const f = CATCH[item.id];
  if (!f) return 0;
  const t = clamp((item.kg - f.kg[0]) / (f.kg[1] - f.kg[0] || 1), 0, 1.2);
  return Math.max(1, Math.round(f.price * (0.7 + 0.7 * t)));
}

// ================= Game state (the host's copy is the truth) =================
let state = null;
let net = { peer: null, conn: null, isHost: false, seat: 0, code: "", connected: false };
function newPlayer(i) {
  return { name: i ? "Player 2" : "Player 1", look: DEFAULT_LOOKS[i], x: SPAWNS[i].x, y: SPAWNS[i].y, dir: "down",
           rod: 0, cooler: 0, items: [], bait: { worms: 5, lure: 0, glow: 0 }, useBait: "worms", xp: 0, caught: 0, best: null, line: null, tp: 0 };
}
function newGame() {
  return { v: 1, players: [newPlayer(0), newPlayer(1)], team: { gold: 50, caught: 0, earned: 0, legends: 0, treasure: 0 }, dex: {}, log: [], created: Date.now() };
}
function migrate(s) {
  const g = newGame();
  const out = { ...g, ...s, team: { ...g.team, ...(s.team || {}) }, dex: s.dex || {}, log: s.log || [] };
  out.players = [0, 1].map(i => {
    const p = { ...newPlayer(i), ...((s.players || [])[i] || {}) };
    p.bait = { ...newPlayer(i).bait, ...(p.bait || {}) };
    p.items = (p.items || []).filter(it => it && CATCH[it.id]);
    if (!walkable(p.x, p.y)) Object.assign(p, SPAWNS[i]);
    return p;
  });
  return out;
}
const progress = s => s ? (s.team.caught || 0) * 10 + (s.team.earned || 0) : -1;
function save() { if (state && net.code) writeJSON(saveKey(net.code), state); }
function addLog(text, ok) { state.log.unshift({ text, ok: !!ok }); state.log = state.log.slice(0, 60); }

// collision: a small box around the feet
const R = 0.28;
function walkable(x, y) {
  for (const [ox, oy] of [[-R, -R * .6], [R, -R * .6], [-R, R * .6], [R, R * .6]]) {
    if (!walkTile(tileAt(Math.floor(x + ox), Math.floor(y + oy)))) return false;
  }
  return true;
}

// ---- Casting: straight out in the direction you face; the bobber lands on the first water past the power you charged
function castRay(p, power) {
  const [dx, dy] = DIRS[p.dir] || DIRS.down, reach = RODS[p.rod].reach;
  const sx = Math.floor(p.x), sy = Math.floor(p.y);
  const water = [];
  for (let k = 1; k <= reach; k++) { const x = sx + dx * k, y = sy + dy * k; if (waterAt(x, y)) water.push({ x, y, k }); }
  if (!water.length) return null;
  if (power == null) return water[0];
  const want = 1 + power * (reach - 1);
  return water.reduce((a, b) => Math.abs(b.k - want) < Math.abs(a.k - want) ? b : a);
}

function rollCatch(p, tx, ty, now) {
  const kind = WATER_KEYS[tileAt(tx, ty)], deep = depthAt(tx, ty) >= 3, night = isNight(now), lvl = levelOf(p.xp);
  const bait = p.useBait && p.bait[p.useBait] > 0 ? p.useBait : null;
  const hot = nearHot(tx, ty, now), rod = RODS[p.rod];
  let rare = 1 + rod.power * .15 + (hot ? .6 : 0) + (bait === "lure" ? 1 : 0) + (bait === "glow" && (night || deep) ? 1.2 : 0);
  const pool = FISH.filter(f => f.water.includes(kind) && f.lvl <= lvl && (!f.time || f.time === (night ? "night" : "day")) && (!f.deep || deep))
    .map(f => ({ f, w: f.w <= 7 ? f.w * rare : f.w }));
  pool.push(...JUNK.map(f => ({ f, w: f.treasure ? f.w * (1 + rod.power * .2) : f.w * Math.max(.3, 1 - rod.power * .15 - (bait ? .3 : 0)) })));
  let roll = Math.random() * pool.reduce((a, o) => a + o.w, 0), pick = pool[0].f;
  for (const o of pool) { roll -= o.w; if (roll <= 0) { pick = o.f; break; } }
  const look = cleanLook(p.look);
  let t = Math.pow(Math.random(), 1.6);                                     // most fish are on the small side
  if (LOOKS.pet[look.pet] === "Cat") t = Math.min(1, t * 1.08 + .04);
  const kg = +(pick.kg[0] + (pick.kg[1] - pick.kg[0]) * t).toFixed(2);
  let wait = 2200 + Math.random() * 5500;
  wait *= 1 - rod.power * .06;
  if (bait === "worms") wait *= .6; else if (bait === "glow" && (night || deep)) wait *= .75;
  if (hot) wait *= .65;
  const dog = LOOKS.pet[look.pet] === "Dog";
  const win = Math.max(650, 1300 - (pick.d || 1) * 45) + (dog ? 450 : 0);
  return { fish: pick.id, kg, biteAt: now + Math.round(wait), win, bait };
}

// ---- Host: apply an action from either player, return a result to broadcast (or null)
let lineSeq = 1;
function applyAction(seat, a) {
  const p = state.players[seat], now = Date.now();
  if (!a || typeof a !== "object") return null;
  if (a.type === "cast") {
    if (p.line) return null;
    if (typeof a.x === "number" && walkable(a.x, a.y) && Math.hypot(a.x - p.x, a.y - p.y) < 3) { p.x = a.x; p.y = a.y; }
    if (DIRS[a.dir]) p.dir = a.dir;
    const tx = a.tx | 0, ty = a.ty | 0;
    if (!waterAt(tx, ty) || Math.hypot(tx + .5 - p.x, ty + .5 - p.y) > RODS[p.rod].reach + 1.2) return { text: "Too far to cast there.", ok: false, seat, private: true };
    const r = rollCatch(p, tx, ty, now);
    if (r.bait) p.bait[r.bait]--;
    p.line = { id: lineSeq++, x: tx, y: ty, ox: p.x, oy: p.y, ...r, hooked: false };
    return { quiet: true, seat };
  }
  if (a.type === "hook") {
    const L = p.line;
    if (!L || L.id !== a.id || L.hooked) return null;
    if (now < L.biteAt - 400) { p.line = null; return { text: "Too early — the fish spooked!", ok: false, seat, private: true }; }
    if (now > L.biteAt + L.win + 900) { p.line = null; return { text: "Too slow — it stole the bait!", ok: false, seat, private: true }; }
    const f = CATCH[L.fish];
    if (f.junk) return landCatch(seat, true);                               // junk comes straight in
    L.hooked = true; L.hookedAt = now;
    return { quiet: true, seat };
  }
  if (a.type === "land") {
    const L = p.line;
    if (!L || L.id !== a.id || !L.hooked) return null;
    return landCatch(seat, !!a.ok);
  }
  if (a.type === "reel") {
    if (!p.line) return null;
    const missed = a.missed; p.line = null;
    return missed ? { text: "It got away… tap as soon as the bobber dips!", ok: false, seat, private: true } : { quiet: true, seat };
  }
  if (a.type === "sell") {
    const list = a.all ? p.items.map((_, i) => i) : [a.i | 0];
    let gold = 0, n = 0, last = "";
    for (const i of list.sort((x, y) => y - x)) { const it = p.items[i]; if (!it) continue; gold += priceOf(it); n++; last = CATCH[it.id].name; p.items.splice(i, 1); }
    if (!n) return null;
    state.team.gold += gold; state.team.earned += gold;
    const text = n === 1 ? `${p.name} sold a ${last} for 💰${gold}.` : `${p.name} sold ${n} catches for 💰${gold}.`;
    addLog(text, true);
    return { text, ok: true, seat, sfx: "coin" };
  }
  if (a.type === "buy") {
    if (a.what === "rod") {
      const i = a.i | 0, r = RODS[i];
      if (!r || i !== p.rod + 1) return null;
      if (state.team.gold < r.price) return { text: "Not enough gold in the team stash.", ok: false, seat, private: true };
      state.team.gold -= r.price; p.rod = i;
      const text = `${p.name} bought the ${r.name}! Casts reach ${r.reach} tiles.`; addLog(text, true);
      return { text, ok: true, seat, sfx: "coin" };
    }
    if (a.what === "bait") {
      const b = BAITS[a.id]; if (!b) return null;
      if (state.team.gold < b.price) return { text: "Not enough gold in the team stash.", ok: false, seat, private: true };
      state.team.gold -= b.price; p.bait[a.id] = (p.bait[a.id] || 0) + b.pack; p.useBait = a.id;
      return { text: `+${b.pack} ${b.icon} ${b.name}`, ok: true, seat, private: true, sfx: "coin" };
    }
    if (a.what === "cooler") {
      const i = p.cooler + 1, c = COOLERS[i]; if (!c) return null;
      if (state.team.gold < c.price) return { text: "Not enough gold in the team stash.", ok: false, seat, private: true };
      state.team.gold -= c.price; p.cooler = i;
      return { text: `Bigger cooler: holds ${c.size} catches now.`, ok: true, seat, private: true, sfx: "coin" };
    }
    return null;
  }
  if (a.type === "bait") { if (a.id === "none" || BAITS[a.id]) p.useBait = a.id; return { quiet: true, seat }; }
  if (a.type === "release") { const it = p.items[a.i | 0]; if (!it) return null; p.items.splice(a.i | 0, 1); return { text: `Released the ${CATCH[it.id].name}. 🌊`, ok: true, seat, private: true }; }
  return null;
}

function landCatch(seat, ok) {
  const p = state.players[seat], L = p.line, f = CATCH[L.fish];
  p.line = null;
  if (!ok) return { text: `The ${f.legend ? "legendary fish" : "fish"} slipped off the hook!`, ok: false, seat, fx: { x: L.x, y: L.y, text: "💨", color: "#ffffff" } };
  if (f.treasure) {
    const gold = 60 + Math.floor(Math.random() * 240);
    state.team.gold += gold; state.team.earned += gold; state.team.treasure++;
    const text = `${p.name} fished up a treasure chest with 💰${gold}!`; addLog(text, true);
    return { text, ok: true, seat, sfx: "coin", fx: { x: L.x, y: L.y, text: `+${gold}💰`, color: "#ffd860" }, petHop: true };
  }
  if (p.items.length >= COOLERS[p.cooler].size) return { text: "Your cooler is full! The catch flopped back in. Sell at the 🐟 Fish Market.", ok: false, seat, fx: { x: L.x, y: L.y, text: "🧊 full", color: "#ff9a8a" } };
  p.items.push({ id: f.id, kg: L.kg });
  const before = levelOf(p.xp);
  const xp = f.junk ? 1 : 2 + f.d * 3 + (f.legend ? 60 : 0);
  p.xp += xp;
  const up = levelOf(p.xp) > before ? levelOf(p.xp) : 0;
  if (!f.junk) {
    p.caught++; state.team.caught++;
    const d = state.dex[f.id] || (state.dex[f.id] = { n: 0, best: 0, by: p.name });
    const first = d.n === 0, record = L.kg > d.best;
    d.n++; if (record) { d.best = L.kg; d.by = p.name; }
    if (f.legend) state.team.legends++;
    if (!p.best || L.kg * f.price > p.best.score) p.best = { id: f.id, kg: L.kg, score: L.kg * f.price };
    const sz = sizeLabel(f, L.kg);
    let text = `${p.name} caught ${f.legend ? "the LEGENDARY " : "a "}${sz ? sz.toLowerCase() + " " : ""}${f.name} (${L.kg} kg)!`;
    if (first) text += " 📖 New in the journal!";
    else if (record) text += " 🏆 New record!";
    if (up) text += ` 🎣 Fishing level ${up}!`;
    addLog(text, true);
    return { text, ok: true, seat, sfx: f.legend ? "legend" : "catch", fx: { x: L.x, y: L.y, text: `+${xp} xp`, color: "#9ad0ff" }, petHop: true, levelUp: up, caughtId: f.id };
  }
  return { text: `${p.name} reeled in… ${f.shape} ${f.name.toLowerCase()}. Ew.`, ok: true, seat, neutral: true, fx: { x: L.x, y: L.y, text: f.shape, color: "#ffffff" } };
}

// ---- Host tick: forget lines whose fish left long ago, push the clock
setInterval(() => {
  if (!net.isHost || !state || !net.code) return;
  const now = Date.now();
  let dirty = false;
  state.players.forEach((p, i) => {
    const L = p.line; if (!L) return;
    if (!L.hooked && now > L.biteAt + L.win + 4000) { p.line = null; dirty = true; }
    if (L.hooked && now > L.hookedAt + 90000) { p.line = null; dirty = true; }
  });
  if (dirty) { save(); broadcast({ quiet: true }); }
}, 500);

const TEAM_GOALS = [
  { label: "Catch 10 fish together",       test: s => s.team.caught >= 10 },
  { label: "Catch 50 fish together",       test: s => s.team.caught >= 50 },
  { label: "Catch 250 fish together",      test: s => s.team.caught >= 250 },
  { label: "Earn 1,000 gold",              test: s => s.team.earned >= 1000 },
  { label: "Earn 25,000 gold",             test: s => s.team.earned >= 25000 },
  { label: "Every pond fish in the journal", test: s => FISH.filter(f => f.water[0] === "pond").every(f => s.dex[f.id]) },
  { label: "Fish up a treasure chest",     test: s => s.team.treasure > 0 },
  { label: "Land a legendary fish",        test: s => s.team.legends > 0 },
  { label: "Complete the journal",         test: s => FISH.every(f => s.dex[f.id]) },
];
