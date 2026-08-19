# Mealy Logo and Favicon Specification

The mark, the wordmark and the icon set. Hand-drawn warmth, basil green on
paper, no gradient blobs, no fork-and-spoon clichés.

Colour and radius tokens come from the
[design specification](./DESIGN_Specification.md). This file only covers the
logo.

---

## 1. Concept

The mark is a sprig of basil drawn as a checkmark.

Three leaves sit on a curved stem, and the stem's sweep reads as a tick. That
fuses the two things Mealy does, food and getting things done, into one
shape. It stays legible at 16px because it is one confident stroke plus leaf
blobs.

Rejected on the way here, for the record:

- Plate, fork, spoon. Every cooking app ever.
- Chef's hat. Worse.
- Calendar-with-a-carrot mashups. Too busy at favicon size.
- Letter "M" made of noodles. Cute for five seconds.

The wordmark is "mealy" in Fraunces 600, lowercase, `ink-900`. Lowercase
matches the microcopy voice. The mark sits left of the wordmark, or alone.

---

## 2. The Mark

```xml
<!-- mealy mark: basil-sprig checkmark. 32x32 viewBox, scales anywhere -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <!-- stem: the checkmark sweep -->
  <path
    d="M7 18.5 L13 25 C13 25 16 14 25 7"
    stroke="#2d5a3d"
    stroke-width="3.4"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- leaves rooted on the upstroke, fanned rather than parallel -->
  <path
    d="M20.97 10.78 C21.98 8.37 19.71 5.27 17.03 5.74 C15.93 8.22 18.39
       11.18 20.97 10.78 Z"
    fill="#2d5a3d"
  />
  <path
    d="M17.57 15.26 C17.27 12.48 13.65 10.87 11.45 12.79 C11.7 15.69 15.42
       17.06 17.57 15.26 Z"
    fill="#2d5a3d"
  />
  <!-- tip leaf: points up, so it ends the sprig instead of thickening the
       end of the stroke -->
  <path
    d="M24.9 7 C27.38 6.59 28.57 3.31 26.69 1.48 C24.1 1.86 23.14 5.21 24.9
       7 Z"
    fill="#3f7a53"
  />
</svg>
```

Notes on the construction:

- One stroke weight, 3.4 in a 32 viewBox, which is about the Lucide 1.75px
  feel at UI sizes. It sits comfortably next to the tab bar icons.
- The tip leaf is a lighter green, `#3f7a53`. It adds a little life without
  introducing a new hue. At 16px it just reads as brightness, which is fine.
- Round caps everywhere, matching the round checkboxes in the shopping list.
- Each leaf is an ovate almond: a point where it meets the stem, widest
  about 40% along, a soft point at the tip. Widths run 4.6 to 5.2 units in
  the 32 viewBox. Thinner than that and they read as thorns.
- The three leaves fan rather than sit parallel. Measured off the stem's
  outward normal, the lower leaf points 158°, the upper 128° and the tip
  leaf 72°. Give them the same angle and the mark reads as an antler. Take
  the tip leaf much past 90° and it detaches into a bud floating beside the
  end of the stroke.
- The leaf bases sit on the stem centreline, not beside it, so each leaf
  grows out of the stroke instead of floating next to it.

---

## 3. Lockups

| Lockup                     | Use                                      |
| -------------------------- | ---------------------------------------- |
| Mark only                  | Favicon, PWA icon, FAB branding, loading |
| Mark + "mealy", horizontal | Landing page header, app top bar         |
| Mark + "mealy", stacked    | Splash and install screen (post-MVP PWA) |

Clear space around the mark is the height of one leaf. The wordmark baseline
aligns to the bottom of the checkmark's lower vertex. The gap between mark
and wordmark is 0.5× the mark width.

Only these four colour variants:

- `basil-700` mark, `ink-900` wordmark, on `paper-50`. The default.
- All `paper-50` on `basil-700`. Inverted, for the PWA icon.
- All `ink-900`. Monochrome fallback.
- Never white on white with a drop shadow, and never gradients or outlines.

---

## 4. Favicon and App Icons

At 16px, subtlety dies. The favicon version simplifies: drop the tip leaf,
thicken the stroke, and put the mark on a filled tile so it survives light
and dark browser tabs.

```xml
<!-- favicon.svg: basil tile, works on any tab colour -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#2d5a3d"/>
  <path
    d="M8.5 18.5 L14 24.5 C14 24.5 16.5 14.5 24.5 8"
    stroke="#faf7f0"
    stroke-width="3.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
  <path
    d="M20.89 11.54 C22.06 9.11 19.9 5.93 17.13 6.36 C15.86 8.87 18.22 11.9
       20.89 11.54 Z"
    fill="#faf7f0"
  />
  <path
    d="M17.78 15.88 C17.57 13 13.97 11.33 11.7 13.3 C11.86 16.3 15.56 17.73
       17.78 15.88 Z"
    fill="#faf7f0"
  />
</svg>
```

The tile is `basil-700` with `rx="7"`, about 22%, the same proportional
radius family as the 10px cards. A paper-cream mark on green is findable in
a row of 40 tabs, and it is the inverted lockup, so it stays on-system.

File set, all of it written by `pnpm icons` from the geometry in
`src/lib/logo.ts`. Rerun it after changing the mark, and commit the result.

```text
public/
  favicon.svg            ← the SVG above (modern browsers)
  favicon.ico            ← 16, 32 and 48px fallback, from the same SVG
  apple-touch-icon.png   ← 180×180, tile WITHOUT rounded corners
                            (iOS applies its own mask, so bake in ~12%
                            padding)
  icon-192.png           ← PWA (post-MVP, but cheap to ship now)
  icon-512.png
  icon-maskable-512.png  ← mark at 60% of canvas, basil bg edge to edge
```

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#faf7f0" />
```

`theme-color` is paper, not green. The browser chrome should blend with the
app background rather than shout.

---

## 5. Don'ts

- Don't put the full three-leaf mark below 24px. Use the favicon
  simplification.
- Don't recolour the mark tomato. Tomato is for CTAs, the brand is basil.
- Don't add a "your meal planning companion" tagline under the wordmark.
- Don't animate the logo. The one permitted exception is a subtle draw-on of
  the checkmark stroke on the landing page, 400ms, once.
