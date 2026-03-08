// Breadboard coordinate system
// Rows: w, x (top power rails) | a-e (top main) | f-j (bottom main) | y, z (bottom power rails)
// Cols: 1-63

export const PITCH = 22;         // pixels between holes
export const BOARD_PADDING_X = 40;
export const BOARD_PADDING_Y = 32;
export const COLS = 63;

// Row y-positions as multiples of PITCH from board top (after padding)
const ROW_Y_INDEX = {
  w: 0,
  x: 1,
  // rail-to-main gap ~0.8
  a: 2.6,
  b: 3.6,
  c: 4.6,
  d: 5.6,
  e: 6.6,
  // center gap ~1.5
  f: 8.6,
  g: 9.6,
  h: 10.6,
  i: 11.6,
  j: 12.6,
  // main-to-rail gap ~0.8
  y: 14.2,
  z: 15.2,
};

export const ALL_ROWS = Object.keys(ROW_Y_INDEX);
export const POWER_ROWS = ['w', 'x', 'y', 'z'];
export const TOP_MAIN_ROWS = ['a', 'b', 'c', 'd', 'e'];
export const BOTTOM_MAIN_ROWS = ['f', 'g', 'h', 'i', 'j'];

export const BOARD_WIDTH = BOARD_PADDING_X * 2 + (COLS - 1) * PITCH;
export const BOARD_HEIGHT = BOARD_PADDING_Y * 2 + 15.2 * PITCH;

export function getHoleX(col) {
  return BOARD_PADDING_X + (col - 1) * PITCH;
}

export function getHoleY(row) {
  return BOARD_PADDING_Y + (ROW_Y_INDEX[row] ?? 0) * PITCH;
}

export function getHolePos(row, col) {
  return { x: getHoleX(col), y: getHoleY(row) };
}

export const POWER_ROW_CONFIG = {
  w: { fill: '#fef2f2', stroke: '#ef4444', label: '+' },
  x: { fill: '#eff6ff', stroke: '#3b82f6', label: '−' },
  y: { fill: '#fef2f2', stroke: '#ef4444', label: '+' },
  z: { fill: '#eff6ff', stroke: '#3b82f6', label: '−' },
};
