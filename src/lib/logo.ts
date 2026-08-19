/**
 * Geometry for the basil-sprig checkmark described in
 * `docs/LOGO_Specification.md`. The React `<Logo>` and the icon generator in
 * `scripts/generate-icons.ts` both draw from here, so the app and the
 * favicons cannot drift apart.
 *
 * All path data is authored in a 32x32 viewBox.
 */

/** Brand colours, duplicated from the design spec because the generated PNGs
 * are built outside the stylesheet and need literal values. */
export const LOGO_COLOURS = {
  basil: '#2d5a3d',
  basilLight: '#3f7a53',
  paper: '#faf7f0',
} as const

export type Sprig = {
  /** The checkmark sweep. Stroked, not filled. */
  stem: string
  stemWidth: number
  /** Leaves rooted on the upstroke, fanned so they do not read as parallel
   * prongs. Lower one points left, upper one up-left. */
  leaves: [string, string]
  /** The lighter leaf at the tip, pointing up so it terminates the sprig
   * instead of thickening the end of the stroke. Absent below 24px. */
  tipLeaf?: string
  /** Ink bounds including the stroke, measured by rasterising the paths.
   * Used as a viewBox so a mark centres inside a tile. */
  bounds: string
}

/** The full three-leaf mark. Anything 24px and up. */
export const MARK: Sprig = {
  stem: 'M7 18.5 L13 25 C13 25 16 14 25 7',
  stemWidth: 3.4,
  leaves: [
    'M20.97 10.78 C21.98 8.37 19.71 5.27 17.03 5.74 C15.93 8.22 18.39 11.18 20.97 10.78 Z',
    'M17.57 15.26 C17.27 12.48 13.65 10.87 11.45 12.79 C11.7 15.69 15.42 17.06 17.57 15.26 Z',
  ],
  tipLeaf:
    'M24.9 7 C27.38 6.59 28.57 3.31 26.69 1.48 C24.1 1.86 23.14 5.21 24.9 7 Z',
  bounds: '5.3 1.45 22.35 25.25',
}

/** The favicon simplification: no tip leaf, heavier stroke, so it survives
 * 16px. The two leaves take the same fan angles as the full mark, rooted on
 * this stem rather than the other one. */
export const FAVICON_MARK: Sprig = {
  stem: 'M8.5 18.5 L14 24.5 C14 24.5 16.5 14.5 24.5 8',
  stemWidth: 3.8,
  leaves: [
    'M20.89 11.54 C22.06 9.11 19.9 5.93 17.13 6.36 C15.86 8.87 18.22 11.9 20.89 11.54 Z',
    'M17.78 15.88 C17.57 13 13.97 11.33 11.7 13.3 C11.86 16.3 15.56 17.73 17.78 15.88 Z',
  ],
  bounds: '6.6 6.1 19.8 20.3',
}

/** Corner radius of the icon tile, as a fraction of its width. Matches the
 * proportional radius of a 10px card. */
export const TILE_RADIUS = 0.22
