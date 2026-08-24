# ZXY International — Pitch Page Screen Specs

---

## Screen 1 — Intro / Hero
**Figma node:** `121:413`

### Design
- **Background:** `#051928` (dark navy)
- **Star field:** 4 star images tiled 2×2, `mix-blend-lighten` — fixed, no parallax
- **Globe:** 648×648px 3D render, centered (slightly below center +16.5px)
  - Continents = ZXY raw materials: Hemp, Flax, Cotton boll, Eucalyptus
- **Tooltips:** 4 white pill badges (`border-radius: 6px`), Hanken Grotesk 14px, drop-shadow, downward triangle pointer
  - Hemp → top-left area of globe
  - Flax → top-right area
  - Cotton boll → bottom-left
  - Eucalyptus → bottom-right
- **Nav:** Floating centered pill at top (24px from top)
  - ZXY orange logo circle | nav links pill | search pill | bag pill
  - Font: Hanken Grotesk 14px, white bg, `border: 0.5px solid #dfdfdf`, `border-radius: 100px`

### Animations
| Element | Spec |
|---|---|
| Globe — load | Scale `0 → 1` from center on page load |
| Globe — idle | Slow clockwise Y-axis auto-spin, infinite loop |
| Globe — hover | Rotation **pauses** on hover, resumes on mouse leave |
| Star field | Fixed, static — no parallax |
| Tooltips | Static — click behaviour defined in Screen 2 |
| Scroll | No scroll-driven animation on this screen |

### Assets
- Globe image: 3D render (photorealistic Earth with crop textures)
- Stars: tiled space texture
- Nav icons: search SVG, shopping bag SVG
- ZXY logo: orange circle with "zxy" text

---

## Screen 2 — TBD
*(Feed next screen)*

---

## Screen 3 — TBD
*(Feed next screen)*

---
*Last updated: 2026-08-12*
