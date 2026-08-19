Mealy Logo & Favicon
Staying on-brand: hand-drawn warmth, basil green on paper, no gradient blobs, no fork-and-spoon clichés if we can help it.

1. Concept
The mark: a sprig of basil drawn as a checkmark.

Three leaves on a curved stem, where the stem's sweep reads as a tick. It fuses the two things Mealy does — food and getting-things-done (planning, checking off a list) — in one shape. It stays legible at 16px because it's basically one confident stroke plus leaf blobs.

Rejected on the way here (for the record):

Plate/fork/spoon — every cooking app ever
Chef's hat — worse
Calendar-with-a-carrot mashups — too busy at favicon size
Letter "M" made of noodles — cute for five seconds
Wordmark: "mealy" in Fraunces 600, lowercase, ink-900. Lowercase matches the microcopy voice. The mark sits left of the wordmark, or alone.

2. The Mark (SVG)
xml
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
Notes on the construction:

One stroke weight (3.4/32 ≈ the Lucide 1.75px feel at UI sizes) so it sits comfortably next to your tab bar icons.
The tip leaf is a lighter green (#3f7a53) — a tiny bit of life without introducing a new hue. At 16px it just reads as brightness, which is fine.
Round caps everywhere; matches the round checkboxes in the shopping list.
You'll want to nudge the leaf bezier handles by eye in Figma/Inkscape — SVG-by-hand gets you 90% there; the last 10% is making the leaves feel plump rather than pointy.

3. Lockups
Lockup	Use
Mark only	Favicon, PWA icon, FAB-adjacent branding, loading state
Mark + "mealy" horizontal	Landing page header, app top bar
Mark + "mealy" stacked	Splash/install screen (post-MVP PWA)
Spacing rule: clear space around the mark = the height of one leaf. Wordmark baseline aligns to the bottom of the checkmark's lower vertex; gap between mark and wordmark = 0.5× mark width.

Color variants (only these four):

basil-700 mark + ink-900 wordmark on paper-50 — default
All paper-50 on basil-700 — inverted, for the PWA icon
All ink-900 — monochrome fallback
Never: white-on-white with a drop shadow, gradients, outlines
4. Favicon & App Icons
Favicon reality check: at 16px, subtlety dies. So the favicon version simplifies — drop the tip leaf, thicken the stroke, put it on a filled tile so it survives light and dark browser tabs:

xml
<!-- favicon.svg: basil tile, works on any tab color -->
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
The tile is basil-700 with rx="7" (~22% — same proportional radius family as your 10px cards). Paper-cream mark on green: instantly findable in a row of 40 tabs, and it's your inverted lockup, so it's still on-system.

File set:

text
public/
  favicon.svg            ← the SVG above (modern browsers)
  favicon.ico            ← 32px fallback, generated from the SVG
  apple-touch-icon.png   ← 180×180, tile WITHOUT rounded corners
                            (iOS applies its own mask; bake in ~12% padding)
  icon-192.png           ← PWA (post-MVP but cheap to ship now)
  icon-512.png
  icon-maskable-512.png  ← mark at 60% of canvas, basil bg edge-to-edge
html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#faf7f0" />
(theme-color as paper, not green — the browser chrome should blend with the app background, not shout.)

5. Don'ts
Don't put the full three-leaf mark below 24px — use the favicon simplification.
Don't recolor the mark tomato. Tomato is for CTAs; the brand is basil.
Don't add "your meal planning companion" taglines under the wordmark.
Don't animate the logo (a subtle draw-on of the checkmark stroke on the landing page is the one permitted exception, 400ms, once).