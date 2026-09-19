// Single source of truth for grid thumbnail sizing.
//
// Imported by make-grid-thumbs.mjs (regenerate all) and to-avif.mjs (new
// uploads) so the two can never drift apart. If the grid CSS changes, change
// the constants here and regenerate.
//
// These MUST match .photo-grid / .photo-grid-item in src/styles/global.css:
//   .photo-grid          max-width 1400px, 3 columns at >=1024px, gap 3px
//   .photo-grid-item     aspect-ratio 1/1
//   --portrait           grid-row: span 2
//   --wide               grid-column: span 2
//
// Because the grid is capped at max-width, cells are a fixed CSS size no matter
// how large the display. DPR 2 is therefore the real ceiling — a 4K monitor
// cannot resolve more than this, so generating beyond it is wasted decode.

export const MAX_WIDTH = 1400;
export const GAP = 3;
export const COLS = 3;
export const DPR = 2;

export const CELL = (MAX_WIDTH - GAP * (COLS - 1)) / COLS; // 465 CSS px
export const SPAN2 = CELL * 2 + GAP; // 932 CSS px

/**
 * Device-pixel size of the cell a photo will occupy.
 * `portrait` and `wide` describe the GRID SLOT, not the file.
 */
export function cellSize({ portrait = false, wide = false } = {}) {
  return {
    width: (wide ? SPAN2 : CELL) * DPR,
    height: (portrait ? SPAN2 : CELL) * DPR,
    type: wide ? "wide" : portrait ? "portrait" : "square",
  };
}

/**
 * sharp .resize() options that scale the FULL frame to exactly the resolution
 * object-fit: cover needs for this cell. No crop is baked in — CSS still does
 * the cropping — and masters smaller than the cell are left at native size.
 */
export function thumbResizeOptions(meta, slot) {
  const cell = cellSize(slot);
  const scale = Math.max(cell.width / meta.width, cell.height / meta.height);
  return {
    width: Math.ceil(meta.width * scale),
    height: Math.ceil(meta.height * scale),
    fit: "inside",
    withoutEnlargement: true,
  };
}

/**
 * Read the grid slot out of a photos.json entry.
 * width/height there are layout directives, not file metadata — see
 * PhotoCard.astro: isPortrait = height > width.
 */
export function slotFromPhoto(photo) {
  return { portrait: photo.height > photo.width, wide: Boolean(photo.wide) };
}
