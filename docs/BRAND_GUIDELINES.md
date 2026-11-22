# CapItUp brand guidelines

## Source and shape

The supplied `capitup.png` is a **2000 × 2000 square illustration**, now used without recoloring at `public/brand/capitup.png`. It shows a diagonal dark pen over a black celestial chart, with gold constellation lines and violet/yellow stars. It contains **no wordmark** and no separately supplied icon or light variant. Exact dominant pixels include black `#000000` (50.33%), violet `#8C52FF` (1.94%), periwinkle `#8080FF` (1.87%), and yellow `#FADF66` (1.34%). Threshold sampling puts approximately 51.37% of pixels near black, 21.65% violet-toned, and 6.43% yellow/gold; these are image measurements, not mandatory UI color quotas.

## Logo usage

- Use the complete square artwork, never stretch, rotate, crop the pen/stars, recolor, or place text over it. `BrandMark` combines it with a separate **CapItUp** text lockup.
- Keep clear space of at least **1/8 of the artwork's displayed width** on every side. Use a dark badge or dark field on light surfaces; the supplied black background is part of the art. A transparent/light artwork variant has not been supplied.
- For navigation or compact surfaces, pair the artwork with an accessible text label. Do not extract a single star as an "official" icon. At very small sizes use the text lockup alone if the illustration becomes illegible.
- The image is decorative when adjacent to the wordmark; the combined component exposes one accessible name, “CapItUp.”

## Palette and tokens

| Role | Hex | CSS token | Use |
|---|---|---|---|
| Canvas | `#08090D` | `--canvas`, `--background` | Main dark field |
| Elevated canvas | `#0E1016` | `--canvas-elevated`, `--sidebar` | Navigation/background depth |
| Surface | `#151820` / `#1F2428` / `#292E34` | `--surface-1/2/3` | Cards and controls |
| Primary text | `#F5F3FF` | `--text-primary` | Body and headings |
| Violet | `#8C52FF` | `--lavender`, `--violet`, `--accent` | Selected states and visual emphasis |
| Soft violet | `#C7B3FF` | `--lavender-soft`, `--ring` | Focus and readable violet text |
| Gold | `#FADF66` | `--attention`, `--primary` | Main action and priority highlights |

Tailwind's `bg-background`, `text-foreground`, `bg-primary`, and other semantic colors map to these CSS variables via `@theme inline` in `src/app/globals.css`. Keep status colors distinct from brand colors; a gold accent is not an error indicator.

### Contrast rules

Measured WCAG contrast ratios: primary text on canvas **18.14:1**; gold on canvas **14.98:1**; violet on canvas **4.52:1**; near-black text on violet **4.52:1**; white text on violet **4.41:1**. Use near-black text on solid violet controls, or soft violet text on dark surfaces. Do **not** use white body text on solid `#8C52FF` for normal-sized copy. Verify focus rings and status chips against their actual local surface when adding components.

## Typography

- **Space Grotesk**: headings, product lockup, and short display labels. Keep natural letterforms and avoid all-caps paragraphs.
- **Inter**: body, buttons, form controls, long caption text, and data-dense UI. Keep a system sans fallback.
- Both are loaded through `next/font/google` in `src/app/layout.tsx`, self-hosted by Next.js at build time. A production build needs font download access when the font cache is cold.

The former indigo/lavender palette was provisional. Preserve accessible sizing and focus behavior as colors change; the final rendered UI still needs desktop/mobile visual review.
