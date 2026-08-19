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
  <!-- leaves along the upstroke -->
  <path
    d="M19.5 10.5 C16.5 9.5 15.5 6.5 16.5 4.5 C19 4.8 21 6.8 20.8 9.6 Z"
    fill="#2d5a3d"
  />
  <path
    d="M17 15.5 C13.8 15.3 12 12.8 12.3 10.5 C15 10.3 17.5 12 17.8 14.8 Z"
    fill="#2d5a3d"
  />
  <path
    d="M25 7 C25.5 4.5 27.5 3 29.5 3 C29.8 5.5 28.3 7.8 25.8 8.2 Z"
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
- Nudge the leaf bezier handles by eye in Figma or Inkscape. Hand-written SVG
  gets you 90% of the way. The last 10% is making the leaves feel plump
  rather than pointy.

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
    d="M20 11.5 C17 10.5 16 7.5 17 5.5 C19.5 5.8 21.5 7.8 21.3 10.6 Z"
    fill="#faf7f0"
  />
  <path
    d="M17 16.5 C14 16.3 12.3 13.8 12.6 11.5 C15.2 11.3 17.6 13 17.9 15.8 Z"
    fill="#faf7f0"
  />
</svg>
```

The tile is `basil-700` with `rx="7"`, about 22%, the same proportional
radius family as the 10px cards. A paper-cream mark on green is findable in
a row of 40 tabs, and it is the inverted lockup, so it stays on-system.

File set:

```text
public/
  favicon.svg            ← the SVG above (modern browsers)
  favicon.ico            ← 32px fallback, generated from the SVG
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
