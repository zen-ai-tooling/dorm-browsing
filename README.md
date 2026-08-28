# Dorm Browsing

Dorm Vibes — Pass 1 Build Prompt (2D Prototype)

Paste everything below into Lovable to start the new project.

Project Overview

Build Dorm Vibes, a MySpace-inspired social browsing app reimagined as a walkable 2D dorm floor — closer to a small Gather.town map than a single corridor. Instead of scrolling a profile, the user moves a character around a floor plan of personal dorm rooms and shared common spaces, and each personal room reveals its owner's "Top 5 songs" and a bulletin board of interests/events through proximity, not clicks.

This is not just a hallway of doors — it's a small, wanderable floor. Personal rooms are where you find out about a specific person; common rooms are where the "who's around" feeling of Gather.town lives — spaces built for lingering and imagining others passing through, not just a means to get to a door.

This is a browsing tool wearing a game's clothes, not a game. The target moment is someone popping in for 2-3 minutes on a work break, wandering, seeing what friends are up to, and leaving. Every decision below optimizes for lightweight, low-commitment, zero-friction browsing — never for challenge, difficulty, or sustained engagement.

Scope for this build: pure visual/interaction prototype. Hardcoded mock data only. No backend, no login, no database, no persistence. The only goal is making "walk around a real little floor and it feels right" fully solid.

Tech Approach

Build this as a 2D top-down sprite-based scene using Phaser.js embedded inside the React/Lovable app (a single React component mounting a Phaser game instance in a container div, with Phaser owning the canvas, game loop, sprite rendering, and tile-based collision). Do not use React Three Fiber, Three.js, or any 3D approach — do not use raw HTML5 Canvas hand-rolled from scratch either. Phaser is the right call here: it has mature, well-supported primitives for exactly this pattern (tilemaps, sprite animation, arcade physics for movement/collision, camera bounds) and is far more reliable for an AI coding tool to build correctly than either a from-scratch canvas engine or a 3D scene graph.

Critical performance lesson from a previous attempt (read this carefully): We previously built this same concept in 3D with React Three Fiber. It became severely, unfixably laggy — 632 meshes, 1,234 draw calls, and ~100 distinct shader programs for only ~70k triangles, entirely because nearly every object (trim, props, posters, lights) was built as its own unique mesh/material instead of sharing or pooling assets. React state, particle systems, and the camera system were all fine — it was purely draw-call and material-instance explosion, worsened by too many simultaneous dynamic point lights. The lesson: reuse assets, never let "just one more unique object" creep in without sharing textures/materials. A 2D sprite approach sidesteps most of this risk structurally, but keep the discipline anyway — use a single sprite sheet/atlas per character and one shared tileset for the environment rather than dozens of individual image assets, and reuse the same sprite/animation definitions across all room instances rather than authoring unique assets per room.

Art Direction

Blend three references:

Gather.town — for the interaction model, skimmable top-down legibility, and the overall floor-plan feel: a small map of distinct named spaces you wander between, not a single throughway. Movement, camera, and interaction should feel very close to a Gather.town space specifically — that's the reference to hold closest, not just a vague inspiration.

Animal Crossing — for soft, rounded, friendly character and world design. Explicitly avoid anything sharp, blocky, or "Minecraft-like" — that reads as too gamified for this use case.

Early-2000s MySpace — for the personalization layer: glow accents, decorated doors, stickers, "this is MY space" energy.

Palette: soft, cute, pastel-leaning. Not dark or moody — a jewel-tone/moody direction was tested previously and didn't land. Lead with an inviting pastel base (soft blues, warm creams, gentle greens) and layer in MySpace-style personalization — per-room accent colors, stickers, glow, posters — as the mechanism that keeps each room feeling social and personal, rather than leaning on darkness for mood.

Character: soft, rounded, chibi-leaning proportions with a clear, iconic silhouette. Give the character clear facial features at minimum simple eyes — a previous version's character read as a blank mannequin, which was a real complaint. Don't repeat that.

Sprite style: clean, colorful flat-vector-style sprite art (simple shapes, bold fills, soft outlines) rather than fine detailed pixel art — this renders more reliably and attractively given typical AI-generated 2D asset quality. Build the character as a spritesheet with idle + 4-directional walk animations (down/up/left/right), and reuse this same sheet/skeleton for any future companion or NPC sprites.

Scene & World Structure

Build a single connected dorm floor map on a Phaser tilemap with tile-based collision (simple grid AABB via Arcade Physics — no 3D-style collider work needed): a central hallway/corridor spine that personal rooms and common rooms both branch off of, all on one continuous walkable floor rather than separate loading screens between spaces. Think one Gather.town "room" file, not a level-select flow. Size it to be fully wanderable in a couple of minutes at a relaxed walk — big enough to feel like a real floor, small enough that nobody gets lost.

A. Personal dorm rooms — three, one per mock person (see Mock Data below). Each door is visually distinct via its owner's accent color, a small nameplate, and a cluster of 2-3 decorative sticker/decal icons reflecting that person's interests. Each personal room, once entered, contains:

A speaker object — walking up to it triggers a popup showing that person's Top 5 songs (title + artist).

A bulletin board — walking up to it triggers a popup with that person's 2-3 interest/event text items and one placeholder image.

A companion object (pet or plant) — walking up to it triggers a popup with its name and a short personality blurb.

Wallpaper and a poster as background/decor, colored per the room's mood preset (see Room Mood below).

B. Common rooms — shared spaces built for lingering, not just passing through. Add the following (decorate freely beyond this list if it improves the feel, in the same soft/pastel/Animal-Crossing-leaning style):

Common Lounge — the social heart of the floor. Couches, a low table, a TV/game console prop, maybe a record player. This is the room that should feel most like "people hang out here" — the natural Gather.town-style gathering spot.

Courtyard / outdoor quad — a small open-air area (grass tile set, a bench or two, maybe string lights or a tree) that breaks up the indoor floor plan and gives the map some breathing room and a different visual texture from the interior rooms.

Study Lounge — a couple of desks/tables and a bookshelf, quieter and cooler-toned than the Common Lounge, for visual variety.

Kitchenette — small, casual, warm-toned; a fridge and counter are enough. Good home for one of the flavor-text props below.

Common rooms don't belong to any one person and have no accent color of their own — treat them as neutral/shared zones, visually calmer than the personalized doors, so the personal rooms still read as the most "decorated" and expressive spaces on the floor.

C. Shared hallway/floor props (place these in whichever common room or corridor spot fits best):

A shared community corkboard, distinct from personal bulletin boards — 2-3 dorm-wide announcement items (mock text), separate data object from any individual room.

A vending machine — decorative, proximity-hoverable with a small flavor-text popup (e.g. "Out of order" or a joke snack list), no real function needed.

A lost-and-found prop — same treatment, decorative with a small flavor popup.

Warm ambient lighting achieved via simple 2D tinting/gradient overlays, not real-time lighting — keep this cheap.

A locked, silhouetted "more rooms coming" door somewhere on the floor, visually distinct (dimmed/greyed, a lock icon) to imply the space continues beyond what's built.

Presence, glow, and sound cues on personal rooms — keep these in this pass, don't defer them. Each personal room's door (and ideally the room's interior ambience too) should carry:

An animated glow pulse driven by a mock isActive: true/false per person — active rooms visibly glow/pulse in their accent color; inactive ones sit calm and dim. This is a placeholder for real presence in Pass 2, but the visual itself is core to the floor feeling alive right now, not a nice-to-have.

A "sound is coming from here" visual cue on active rooms — small animated music notes or sound-wave ripples drifting from the door/speaker, reinforcing that someone's in there with music on. This stays purely visual (no actual audio playback) — the cue itself is what matters for this pass.

Character & Movement

Support both click/tap-to-move and WASD/arrow-key movement simultaneously. Clicking a walkable tile paths the character there (simple pathing is fine — doesn't need to be A* if direct-line-with-collision-stop is more reliable to build); pressing a direction key immediately overrides and cancels any in-progress click-path.

Double-check directional intent carefully: in the previous 3D build, WASD directions didn't match what the player visually expected, and that was a real bug. Verify that pressing the "up"/"W" key moves the character visually up/away on screen, and so on for all four directions, before considering movement done.

No dead ends and no way to get stuck — keep the floor plan's corridors and room layouts open enough that the character is always retrievable by walking in an obvious direction, across all rooms, not just the hallway spine.

Camera should gently scroll/follow the character within the bounds of the full floor map (matching Gather.town's own smooth-follow feel), zoomed out enough that the player can usually see the room they're in plus a bit of what's next to it — no camera rig, no collision-avoidance, no FOV tuning; none of that 3D-era complexity applies here.

Moving between rooms should feel seamless — walking through a doorway is just walking, not a transition, load, or scene swap.

Interaction System

All content reveals are proximity-triggered, with zero additional input. Walking near an interactive object (speaker, bulletin board, companion, corkboard, vending machine, lost-and-found, or any common-room prop you add) shows a subtle indicator (soft glow or small icon) as the player approaches, and walking fully up to it auto-opens a popup/modal with its data. No click or keypress ever required to trigger the popup itself — only movement.

Walking away from the object should close its popup automatically.

Popups should be lightweight overlays (not full-screen takeovers) so the player stays oriented in the space while reading them.

Common rooms (Lounge, Courtyard, Study Lounge, Kitchenette) can be lighter on interactive popups than personal rooms — a prop or two with flavor text is enough. Their job is mostly to exist as pleasant, distinct spaces to walk through and imagine other people in, not to deliver dense content the way personal rooms do.

Constantly favor "glance and understand": someone should be able to tell personal rooms apart at a glance (via accent color/decor), see who's active (via the glow + sound cue on their door), tell personal rooms from common rooms at a glance (personalized/expressive vs. calm/neutral), and skim room content without focusing hard.

Room Mood System

Build a small preset system that derives each room's ambient color/atmosphere from that person's music genre / interest tags, rather than hand-picking colors per room. Define presets such as:

chill_ambient — soft blues/teals, slow glow pulse

energetic_dance — warm corals/pinks, faster glow pulse

cozy_soft — warm purples/lavenders, gentle glow pulse

Each mock person's data object should include a mood field mapping to one of these presets, and the room's wallpaper tint, poster accent, and door glow should all derive from that single field — never hardcode a room's colors directly in JSX. This is what makes the system scale to real user data later.

Data Architecture (important — build for Pass 2 from day one)

Every piece of room content must be structured as data, not hardcoded per-room JSX. Concretely: define a single rooms array/object of person records, each shaped roughly like:

{
  id: "room-1",
  name: "Your Room",
  accentColor: "#4A9B8E",
  mood: "chill_ambient",
  isActive: true,
  songs: [ { title: "Midnight City", artist: "M83" }, ... ],
  bulletin: {
    interests: ["Into ambient techno lately", "Learning to skate"],
    event: "Rooftop hang — Fri 8pm"
  },
  companion: { type: "plant", name: "Spike", breed: "succulent", blurb: "low-maintenance, high standards" },
  decor: { wallpaper: "default", poster: "default" },
  doorStickers: ["music-note", "skateboard"]
}


Render all three rooms, the hallway, doors, and decor generically from this array — one Room component/scene-builder function that takes a person record and produces the room, not three separately authored rooms. This is what lets a future coin-economy/customization UI change decor, companion, mood, etc. per user without any component rewrite.

Mock Data (use as-is)

Room 1 — "Your Room" · accent #4A9B8E (teal) · mood: chill_ambient

Songs: "Midnight City" – M83 · "Redbone" – Childish Gambino · "Sunflower" – Rex Orange County · "Instant Crush" – Daft Punk · "Electric Feel" – MGMT

Bulletin: "Into ambient techno lately" · "Learning to skate" · Event: "Rooftop hang — Fri 8pm"

Companion: plant, "Spike," succulent, "low-maintenance, high standards"

Room 2 — "Sam's Room" · accent #E07A5F (coral) · mood: energetic_dance

Songs: "Two Slow Dancers" – Mitski · "Cherry" – Lucy Dacus · "Motion Sickness" – Phoebe Bridgers · "Emily" – Joanna Sternberg · "Jubilee" – Japanese Breakfast

Bulletin: "Reading way too much sci-fi" · "Started pottery class" · Event: "Gallery opening — Sat 6pm"

Companion: your call — invent one in the same spirit (pet or plant, name + short blurb)

Room 3 — "Jordan's Room" · accent #9B6BC7 (purple) · mood: cozy_soft

Songs: "One More Time" – Daft Punk · "Move Your Body" – Marshall Jefferson · "Losing You" – Solange · "Silver Soul" – Beach House · "Digital Love" – Daft Punk

Bulletin: "Deep in a house music phase" · "Training for a half marathon" · Event: "Show at the warehouse — Sun 9pm"

Companion: your call — invent one in the same spirit

Community corkboard (hallway-level, separate data object): 2-3 mock dorm-wide announcements, e.g. "Laundry room out of order until Thursday," "Anyone want to split a pizza order Friday?," "New plant swap shelf by the vending machine."

Nice-to-Haves — Fine to Defer to the Next Pass

These would make the floor feel even more alive, but skip them for now rather than let them slow down getting the core wander feeling solid. Unlike the glow/sound cues above (which stay in this pass), these are genuinely optional polish:

Other wandering NPC characters occupying common rooms, to make the space feel populated even solo

Actual audio playback of the Top 5 songs or ambient room sound (this pass keeps sound purely visual, per the glow/sound-cue note above)

Seating/interaction animations (character actually sitting on a couch, etc.) rather than just standing near props

Small idle animations or flavor behaviors for companions (plant swaying, pet wandering a little)

Additional common rooms beyond the four listed, or a bigger/more elaborate floor plan

Any kind of mini day/night ambient lighting shift

Explicit Scope Fence — Do NOT Build Yet

The following are Pass 2 and out of scope for this prompt. Do not implement any of them, and do not add UI affordances that imply they exist yet:

Real authentication / login (Supabase or otherwise)

A friend system or social graph

Real presence (the isActive pulse stays a mock boolean for now)

A guestbook or any form of commenting/messaging

A coin/currency economy or any way to earn currency

Any room editing / customization UI (even though the data is structured to support it later)

Persistence of any kind — a page refresh resetting everything is fine and expected

Definition of Done for This Pass

The prototype is complete when: the character can be moved fluidly around the full floor (personal rooms, common rooms, and hallway spine, seamlessly connected) via both click-to-move and WASD/arrows with correct directional mapping; the three personal rooms and each common room are visually distinct and legible at a glance; active personal rooms clearly glow and show their sound cue while inactive ones sit calm; every interactive object reveals its popup purely through proximity; all personal-room/door content is rendered generically from the shared data structure rather than hardcoded per room; and the whole thing feels like a calm few-minute wander around a real floor rather than a game with objectives.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/343300db-451b-4686-bd61-a2d85879fe50).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
