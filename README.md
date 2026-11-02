# 🎣 Fish with friends

A co-op fishing game for two players, each on their own device. It's the sister game to [Mine with friends](https://github.com/WhipSmartMacoy/mine-with-friends) but all about fishing.

> 🚧 **Work in progress.** The playable `index.html` is still being built. The game code so far is in `src/`.

## Planned gameplay
- **Lobbies like Mine with friends:** create a lobby, share the 5-character code, and your friend joins. Players connect browser-to-browser with [PeerJS](https://peerjs.com), so you don't need a server or an account.
- **Your angler and pet:** the same character creator as Mine with friends, plus a **dog or cat** that follows you and sits between the joystick and the Cast button on phones.
  - 🐶 **Dog:** barks when a fish bites and gives you longer to hook it.
  - 🐱 **Cat:** your catches come in a bit heavier.
- **One big map** (75 × 75 tiles) drawn on the **Grass BG** texture, with brick paths, a village, two ponds, a river, a lake with a dock and an ocean pier.
- **Fishing:**
  1. Hold **Cast** to charge your throw, then let go.
  2. Tap when the bobber dips to hook the fish.
  3. Hold to keep the reel bar on the fish until you land it.
- **27 fish** across the pond, river, lake and sea. Some only bite at night or in deep water, and there are 4 legendaries. You can also reel in junk and treasure chests.
- **Fishing level** goes from 1 to 10 and unlocks rarer fish.
- **Bubbling hot spots** move every few minutes and make fish bite faster and rarer fish more likely.
- **Day and night:** one in-game day lasts 12 real minutes.
- **Shops:**
  - 🐟 **Fish Market:** sell your catch (bigger fish are worth more) into the shared **team stash**.
  - 🎣 **Tackle Shop:** rods (longer casts and an easier reel), bait (Worms, Shiny Lure, Glow Bait) and bigger coolers.
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
