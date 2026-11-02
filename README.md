# 🎣 Fish with friends

A co-op fishing game for two players, each on their own device. It's the sister game to [Mine with friends](https://github.com/WhipSmartMacoy/mine-with-friends) but all about fishing.

**Play:** https://whipsmartmacoy.github.io/fish-with-friends/ (once GitHub Pages is on — see *Hosting*)

## Controls
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
- **Lobbies like Mine with friends:** create a lobby, share the 5-character code, and your friend joins. Players connect browser-to-browser with [PeerJS](https://peerjs.com), so you don't need a server or an account.
- **Your angler and pet:** the same character creator as Mine with friends, plus a **dog or cat** that follows you and sits between the joystick and the Cast button on phones.
  - 🐶 **Dog:** barks when a fish bites and gives you longer to hook it.
  - 🐱 **Cat:** your catches come in a bit heavier.
- **One big map** (75 × 75 tiles) drawn on the **Grass BG** texture, with brick paths, a village, two ponds, a river, a lake with a dock and an ocean pier.
- **Fishing:**
  1. Hold **Cast** to charge your throw, then let go.
  2. Tap when the bobber dips to hook the fish.
  3. Land it on the Dredge-style dial: tap in the green and avoid the red.
- **27 fish** across the pond, river, lake and sea. Some only bite at night or in deep water. You can also reel in junk and treasure chests.
- **Five rarities:** Common, ◆ Uncommon, ◆◆ Rare, ◆◆◆ Epic and ★ Legendary (9 common, 6 uncommon, 4 rare, 4 epic, 4 legendary).
  - The reel bar shows a fish's rarity as soon as you hook it.
  - Catches, the cooler and the journal are colour-coded by rarity.
  - Better rods, a Shiny Lure, Glow Bait at night and bubbling hot spots all make rarer fish more likely.
- **Fishing level** goes from 1 to 10 and unlocks rarer fish.
- **Bubbling hot spots** move every few minutes and make fish bite faster and rarer fish more likely.
- **Day and night:** one in-game day lasts 12 real minutes.
- **Shops:**
  - 🐟 **Fish Market:** sell your catch (bigger fish are worth more) into the shared **team stash**.
  - 🎣 **Tackle Shop:** rods, bait (Worms, Shiny Lure, Glow Bait) and bigger coolers.
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
- `sprites/tiles/grass-bg.png`, `brick-path.png` and `broken-path.png` come from Mine with friends.
- `sprites/pets/dog.png` and `cat.png` come from Mine with friends. Each is a 4-frame strip and the art faces left.
