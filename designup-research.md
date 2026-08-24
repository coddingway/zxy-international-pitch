# designup.io — Deep Scan Research
> Reference for ZXY International pitch page build

---

## Tech Stack

| Layer | Tech | Evidence |
|---|---|---|
| Framework | React | `#root` mount, ES module type |
| Build | Vite | `index-BjyJGcX8.js` hash filename |
| CSS | CSS Modules | Scoped class names `_overlay_8605t_1` |
| Smooth Scroll | **Lenis** | Body classes `lenis`, `lenis-smooth`, `lenis-scrolling` |
| Scroll Animation | **GSAP + ScrollTrigger** | `pin-spacer` class — ST injects this on pinned elements |
| Motion Files | **Lottie** | `_lottieWrapper`, `_centerLinesLottie` — footer curves, preloader |
| 3D / Canvas | **Custom WebGL** (2 canvases) | NOT Three.js — custom WebGL renderer for particles + globe |
| Fonts | Bricolage Grotesque + Cormorant Garamond | Google Fonts variable fonts |
| Page weight | ~1 single JS bundle | Heavy — all 3D assets loaded upfront, hence long preloader |
| Built by | **Liquidink Design, Bangalore** | Footer credit |

---

## Architecture Pattern

> **Scroll = Time**

One long GSAP timeline mapped to scroll position:

1. **Lenis** normalises scroll input (buttery deceleration)
2. **GSAP ScrollTrigger** pins sections + drives progress values (0→1)
3. **Custom WebGL** renderer reacts to progress values for 3D objects
4. **Preloader** pre-fetches ALL 3D assets (30+ GLBs, 20+ photos) before experience starts
5. Single HTML shell, one JS bundle, one scroll timeline — no routing

---

## Full Section Map

| # | Section Name | Visual / Mechanic |
|---|---|---|
| Preloader | X Logo Assembly | Two `+` shapes rotate and lock into `X`. Percentage counter. Lottie |
| Hero (01) | "DesignUp X Experience" | Full-viewport particle X in white specks. Canvas2D/WebGL. "Scroll ↓" hint |
| Transition | Objects Explode | Particle X disintegrates → 30+ 3D branded objects float in space (drums, cameras, megaphones, badges, caps, books) |
| Transition | 3D Mountains | Night mountain landscape, purple sky atmospheric glow. Camera pulls back |
| Transition | Giant D Zoom | Camera flies INTO giant 3D "D" logo (blue-purple gradient) |
| 01 Title | "the DesignUp Decade" | GSAP pin. Cormorant italic + Bricolage Grotesque bold. 2016→2026 timeline bar |
| 02 | Photo Collage | ~20 photos on 3D orbital rig, scroll rotates 360°. Copy overlaid mid-scene |
| 03 | The Drum Jam | 5 drums → collapses to 1 → tilts → text ribbons spiral it ("Heartbeat", "Breakbeat"...) → globe wireframe with photo panels |
| 04 | Stage / Runway | Cinematic perspective stage floor with neon scan lines |
| 05 | D Logo Tunnel | Camera flies through nested concentric "D" outlines, crimson red. Chromatic aberration confetti |
| 06 | Speaker Globe | Blue-red dot-sphere planet. Concentric text rings of speaker names orbiting like Saturn. WebGL |
| 07 | Food for Thought | 3D "D" logo as food — candy D, berry tart D, pancake D, chocolate D. Horizontal 3D card carousel |
| 08 | A Wardrobe of Memories | Draggable 3D t-shirt. DRAG interaction. 7 shirt variants. Maroon studio lighting |
| 09 | Volunteer Rings | Concentric rotating text rings — volunteer names + years |
| 10 | Take the Seat | Hundreds of circular attendee portrait bubbles, red + B&W, filling viewport |
| Footer | DesignUp 26 | Full-bleed "DesignUp26" white + purple. Lottie curved lines. "Buy Passes" CTA |

---

## Visual Language

### Colour
- Background: Pure `#000000` throughout
- Text: White only — no grays
- Brand gradient: `#e0368c` (pink) → `#6b3de8` (purple) on X/D logo
- Merch scene: Deep crimson `#6b0000` studio lighting
- Accent year: `#7c3aed` purple for "26"

### Typography
| Usage | Font | Style |
|---|---|---|
| Editorial label ("the") | Cormorant Garamond | Italic, light |
| Brand headings ("DesignUp", "Decade") | Bricolage Grotesque | Bold, variable weight |
| Body copy | Bricolage Grotesque | Regular |

### Motion Principles
- Scroll drives ALL animation — nothing auto-plays
- GSAP ScrollTrigger pins sections while inner animation plays out
- Lenis gives buttery deceleration on fast scroll
- 3D objects react to scroll progress value (0→1)
- Lottie for 2D/SVG motion (preloader, footer curves)
- Custom cursor: circle + D logo — state changes on hover

### Nav Pattern
- Minimal sticky: Logo top-left, "• Event 2026" top-right
- No hamburger, no links — pure focus on scroll journey
- Section counter `01` → `10` on right rail
- Transitions between numbers on section change

### Interaction Vocabulary
- TAP (drum section) — triggers audio/animation on click
- DRAG (t-shirt section) — 3D object drag to rotate
- Hover portraits — scale up
- Scroll = primary interaction throughout

---

## Key Observations for ZXY Build

1. **Preloader is brand moment** — not just loading, it's the first impression
2. **Every section = one story beat** — object + copy + atmosphere, not layouts
3. **3D objects are the hero** — photorealistic renders, not illustrations
4. **Text reveals through scroll** — copy slides in from left+right simultaneously as progress hits threshold
5. **Transitions are scenes** — mountains, D-tunnel, confetti are all between-section cinematic cuts
6. **Sound implied** — TAP drum, ribbon words all suggest audio layer
7. **Total page height**: ~29,000px — massive scroll canvas
8. **Load strategy**: Block behind preloader, deliver everything upfront
9. **No CTA above fold** — experience first, conversion last (footer only)
10. **Chromatic aberration** used on transitions — adds cinematic glitch quality

---

*Research captured: 2026-08-12 | Source: designup.io live scan via Chrome browser tools*
