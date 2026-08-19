/**
 * Renders the favicon and app icons from the geometry in `src/lib/logo.ts`,
 * following `docs/LOGO_Specification.md`. Run it with `pnpm icons` after
 * changing the mark, and commit what lands in `public/`.
 *
 * Chromium does the rasterising, so the PNGs match what a browser draws from
 * the same SVG. No image dependency to install.
 */
import { writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { chromium } from '@playwright/test'

import {
  FAVICON_MARK,
  LOGO_COLOURS,
  MARK,
  TILE_RADIUS,
  type Sprig,
} from '../src/lib/logo.ts'

const PUBLIC_DIR = new URL('../public/', import.meta.url)

/** The sprig alone, in its own viewBox so it centres inside whatever box it
 * is given. */
function sprig(
  mark: Sprig,
  ink: string,
  tipInk: string,
  separator = '',
): string {
  const stem =
    `<path d="${mark.stem}" stroke="${ink}" stroke-width="${mark.stemWidth}"` +
    ` stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  const leaves = mark.leaves.map((leaf) => `<path d="${leaf}" fill="${ink}"/>`)
  const tip = mark.tipLeaf
    ? [`<path d="${mark.tipLeaf}" fill="${tipInk}"/>`]
    : []
  return [stem, ...leaves, ...tip].join(separator)
}

type Tile = {
  mark: Sprig
  /** Fraction of the tile the mark's longest side covers. */
  scale: number
  rounded: boolean
}

/** The inverted lockup: a paper mark on a basil tile. */
function tileSvg({ mark, scale, rounded }: Tile): string {
  const box = 32 * scale
  const offset = (32 - box) / 2
  const radius = rounded ? 32 * TILE_RADIUS : 0
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="${round(radius)}" ` +
    `fill="${LOGO_COLOURS.basil}"/>` +
    `<svg x="${round(offset)}" y="${round(offset)}" width="${round(box)}" ` +
    `height="${round(box)}" viewBox="${mark.bounds}" ` +
    `preserveAspectRatio="xMidYMid meet">` +
    sprig(mark, LOGO_COLOURS.paper, LOGO_COLOURS.paper) +
    `</svg></svg>`
  )
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/** The committed favicon.svg, laid out by hand in the spec rather than
 * scaled, because 16px needs the extra weight. */
const FAVICON_SVG = `<!-- favicon.svg: basil tile, works on any tab colour -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${LOGO_COLOURS.basil}"/>
  ${sprig(FAVICON_MARK, LOGO_COLOURS.paper, LOGO_COLOURS.paper, '\n  ')}
</svg>
`

/**
 * Wraps PNGs in an ICO container. Every browser that still asks for
 * favicon.ico accepts PNG-compressed entries.
 */
function packIco(images: Array<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + images.length * 16
  const entries: Array<Buffer> = []
  for (const image of images) {
    const entry = Buffer.alloc(16)
    // An ICO entry is one byte per side, so it tops out at 255.
    entry.writeUInt8(image.size, 0)
    entry.writeUInt8(image.size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(image.data.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += image.data.length
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

const browser = await chromium.launch()
const page = await browser.newPage()

async function rasterise(svg: string, size: number): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size })
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(
    `<body style="margin:0;line-height:0">${sized}</body>`,
    { waitUntil: 'load' },
  )
  return page.screenshot({ omitBackground: true })
}

async function emit(name: string, contents: Buffer | string): Promise<void> {
  await writeFile(new URL(name, PUBLIC_DIR), contents)
  console.log(`wrote public/${name}`)
}

await emit('favicon.svg', FAVICON_SVG)

// One Chromium page does every render, so these stay sequential.
await emit(
  'favicon.ico',
  packIco([
    { size: 16, data: await rasterise(FAVICON_SVG, 16) },
    { size: 32, data: await rasterise(FAVICON_SVG, 32) },
    { size: 48, data: await rasterise(FAVICON_SVG, 48) },
  ]),
)

// iOS applies its own rounded mask, so the tile ships square with padding.
const appleTile = tileSvg({ mark: MARK, scale: 0.76, rounded: false })
await emit('apple-touch-icon.png', await rasterise(appleTile, 180))

const pwaTile = tileSvg({ mark: MARK, scale: 0.66, rounded: true })
await emit('icon-192.png', await rasterise(pwaTile, 192))
await emit('icon-512.png', await rasterise(pwaTile, 512))

// A maskable icon gets cropped to whatever shape the launcher wants, so the
// mark keeps well clear of the edges.
const maskableTile = tileSvg({ mark: MARK, scale: 0.6, rounded: false })
await emit('icon-maskable-512.png', await rasterise(maskableTile, 512))

await browser.close()
