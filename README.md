# 🎣 Fish with friends

A co-op fishing game for 1–4 players, each on their own device. It's the sister game to [Mine with friends](https://github.com/WhipSmartMacoy/mine-with-friends) but all about fishing.

**Play:** https://whipsmartmacoy.github.io/fish-with-friends/ (once GitHub Pages is on — see *Hosting*)

## Controls
**On phones** the game fills the whole screen, with a slim chat bar at the bottom. The top edge is kept clear for the Dynamic Island.
- **Move:** touch anywhere on the game. A joystick pops up centred under your finger and stays there until you lift it.
- **Act:** the 🎣 action button and 🧊 cooler sit in the bottom-right corner, or the bottom-left if you switch them in ⚙️ Settings. Your pet, the chat box and Send sit at the same end of the chat bar, with the latest message on the other side.
- **Map:** tap the minimap (or press M) for a full-screen map. Zoom with the slider, drag to look around, 📍 jumps back to you. The ✕ to close it is top-right, or top-left in the left layout. While a fish is biting or you're on the dial, a tap anywhere on the screen counts as well.
- **⚙️ Settings:** choose which side the buttons go on, how see-through the joystick is (10% by default), the zoom, and get to invite, stats, the journal and leaving the lobby.
- **Full screen:** "Add to Home Screen" in Safari opens the game full screen. A home-screen copy keeps its own saves, separate from the copy in Safari.

**On desktop:**
- **Move:** WASD / arrow keys, or the joystick on phones. The view is **isometric** like Mine with friends, and the stick moves you in screen directions (up = up the screen).
- **Cast:** face the water and **hold Space** (or the 🎣 button). The power bar swings back and forth. Let go to cast; the dashed square shows where the bobber will land.
- **Hook:** when a fish bites, a big **!** pops up over your angler's head (and on the bobber). Tap Space or the **HOOK!** button fast.
- **Reel (a Dredge-style dial):** a needle sweeps around a ring. **Tap** (Space or the 🎯 button) while it's inside a **green catch zone**.
  - Each good tap fills one pip. Hitting the bright centre of the zone is a *Perfect* and eases line strain.
  - **Stay off the red snags:** tapping on one strains the line hard and costs you a pip. Tapping on empty ring strains it a little.
  - If the strain bar fills, the fish gets away.
  - Rarer fish move the needle faster, shrink the green zone and add more red snags. Epic and Legendary fish can swing the needle back the other way, and their snags drift around the ring.
  - Better rods and higher fishing levels widen the green zones.
- **Shops:** walk up to a shop and press Space. **C** opens your cooler, **J** the journal and **Z** changes the zoom.

## Gameplay
- **Lobbies for 2 or 4 anglers:** pick 👥 2 or 👨‍👩‍👧‍👦 4 anglers before you create a lobby, then share the 5-character code. The room grows as friends join, and anyone past the limit is told it's full. Reopening a lobby keeps its size.
  - Each angler gets their own colour: 🔵 host, 🟠, 🟢, 🟣.
  - Leave and rejoin and you get your own seat and progress back.
  - **The game scales with the group:** each extra angler online adds a bubbling hot spot, and fish sell for **+5% per extra angler** (+15% with 4).
  - Players connect browser-to-browser with [PeerJS](https://peerjs.com), so you don't need a server or an account.
- **Your angler and pet:** the same character creator as Mine with friends, plus a **dog or cat** that follows you and sits between the joystick and the Cast button on phones.
  - 🐶 **Dog:** barks when a fish bites and gives you longer to hook it.
  - 🐱 **Cat:** your catches come in a bit heavier.
- **One big map** (75 × 75 tiles) drawn on the **Grass BG** texture, with brick paths, a village, two ponds, a river, a lake with a dock and an ocean pier.
- **Fishing:**
  1. Hold **Cast** to charge your throw, then let go.
  2. Tap when the bobber dips to hook the fish.
  3. Land it on the Dredge-style dial: tap in the green and avoid the red.
- **33 fish, and every water has its own.** No fish is shared between the Pond, River, Lake and Ocean:

  | Water | Fish | ☀️ Day only (6 am – 6 pm) | 🌙 Night only (6 pm – 6 am) | 🕐 Any time |
  |---|---|---|---|---|
  | 🪷 Pond | 8 | Sunfish, Bluegill, ◆◆◆ Koi, ★ Golden Koi | ◆ Bullhead, ◆◆ Ghost Carp | Minnow, ◆ Carp |
  | 🏞️ River | 8 | Rainbow Trout, ★ River King | Shad, ◆ Burbot, ◆◆ Eel | Chub, ◆ Salmon, ◆◆◆ Sturgeon (deep channel) |
  | ⛵ Lake | 8 | Crappie, ◆◆ Pike, ◆◆◆ Muskie (deep) | ◆ Catfish, ◆ Walleye, ★ Old Whiskers (deep) | Perch, Largemouth Bass |
  | 🌊 Ocean | 9 | Mackerel, ◆ Red Snapper, ◆◆◆ Swordfish (deep) | Lanternfish, ◆ Squid, ◆◆ Octopus, ★ Moonfish (deep) | Sardine, ◆◆ Bluefin Tuna (deep) |

  You can also reel in junk (boots, cans, seaweed) and treasure chests. The action button tells you which water you're facing.
- **Five rarities:** Common, ◆ Uncommon, ◆◆ Rare, ◆◆◆ Epic and ★ Legendary (12 common, 8 uncommon, 5 rare, 4 epic, 4 legendary).
  - The reel bar shows a fish's rarity as soon as you hook it.
  - Catches, the cooler and the journal are colour-coded by rarity.
  - Better rods, a Shiny Lure, Glow Bait at night and bubbling hot spots all make rarer fish more likely.
- **Fishing level** goes from 1 to 10 and unlocks rarer fish.
- **Bubbling hot spots** move every half hour and make fish bite faster and rarer fish more likely.
- **Real time:** the world runs on the real 24-hour clock, using the host's time zone so both players share the same time.
  - 12 fish bite only by day (**6 am – 6 pm**), 12 only at night (**6 pm – 6 am**) and 9 at any time. The table above shows which.
  - Everything else bites any time.
  - The sky fades at dusk (5–6:30 pm) and lightens at dawn (5–6:30 am). Windows light up at night, and the game announces sunrise and nightfall.
  - The journal marks every fish as day only, night only or any time, and says whether it's biting right now.
  - Bubbling hot spots move every half hour.
  - **⏳ Hourglass Charm** (💰300 at the Tackle Shop): turn it from your cooler and pick ☀️ **Day** or 🌙 **Night**. That time of day holds for **30 minutes** for both players, so you can catch night fish in the morning or day fish after dark.
    - Turn another of the same kind to stack 30 more minutes. Turning the other kind switches straight over.
    - The HUD shows the minutes left, for example "🌙 9:33 Night ⏳ 28m".
- **Shops:**
  - 🐟 **Fish Market:** sell your catch (bigger fish are worth more) into the shared **team stash**.
  - 🎣 **Tackle Shop:** rods, bait (Worms, Shiny Lure, Glow Bait), ⏳ Hourglass Charms and bigger coolers.
- **8 rod tiers.** You upgrade them in order, and the better ones need a higher fishing level:

  | Rod | Rarity | Reach | Luck | Control | Fishing level | Price |
  |---|---|---|---|---|---|---|
  | Wood | Common | 3 | +0% | +0% | 1 | free |
  | Bronze | Common | 3 | +9% | +8% | 1 | 150 |
  | Iron | ◆ Uncommon | 4 | +18% | +16% | 2 | 400 |
  | Steel | ◆ Uncommon | 4 | +27% | +23% | 3 | 900 |
  | Silver | ◆◆ Rare | 5 | +36% | +31% | 4 | 1,800 |
  | Gold | ◆◆◆ Epic | 5 | +45% | +39% | 6 | 3,600 |
  | Diamond | ◆◆◆ Epic | 6 | +54% | +47% | 8 | 7,000 |
  | Mythril | ★ Legendary | 7 | +63% | +55% | 9 | 13,000 |

  - **Luck** means rarer fish, less junk, more treasure and quicker bites.
  - **Control** means wider green zones on the dial, a slower needle and less line strain from snags and misses.
  - Gold rods and up glint in your hands.
- **Fish journal:** tracks every species and the record weight for each one, with team milestones.

## UI and scaling (carried over from Mine with friends)
- Phone-fit profiles for the iPhone Air and iPhone 15 Pro, plus a short-screen mode for when Safari's toolbars are showing.
- Portrait phones get a square game view with the joystick, pet dock and action button below it. Phones held sideways get a joystick | game | button layout.
- The canvas renders at up to 2× device pixel ratio, and text scales so it never drops below about 12 CSS px.
- A build tag busts phone caches and asks players to reload when a new version is out.

## Hosting
Served with GitHub Pages: **Settings → Pages**, branch `main`, folder `/ (root)`.

## Art
- `icons/apple-touch-icon.png`: the iOS home-screen icon (and `favicon.png`). It's pixel art of a fish being pulled out of the water by a bent rod, drawn on a 45×45 grid and scaled 4×. Regenerate it with `python3 tools/make_icon.py icons` (needs Pillow).
- `sprites/tiles/grass-bg.png`, `brick-path.png` and `broken-path.png` come from Mine with friends.
- `sprites/pets/dog.png` and `cat.png` come from Mine with friends. Each is a 4-frame strip and the art faces left.
