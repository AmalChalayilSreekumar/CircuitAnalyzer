import { BOARD_PADDING_X, BOARD_PADDING_Y, PITCH, COLS, ALL_ROWS, getHolePos } from './boardCoords.js';
import { ARDUINO_PINS } from './arduinoCoords.js';

// Returns the nearest { row, col } (breadboard hole) or { pin } (Arduino pin)
// for a given pixel position (x, y) in board/SVG coordinate space.
export function snapToEndpoint(x, y) {
  // Nearest breadboard column
  const col = Math.max(1, Math.min(COLS, Math.round((x - BOARD_PADDING_X) / PITCH) + 1));

  // Nearest breadboard row (by y proximity)
  const normalizedY = (y - BOARD_PADDING_Y) / PITCH;
  let nearestRow = ALL_ROWS[0];
  let nearestRowDist = Infinity;
  for (const row of ALL_ROWS) {
    const holePos = getHolePos(row, col);
    const dist = Math.hypot(holePos.x - x, holePos.y - y);
    if (dist < nearestRowDist) {
      nearestRowDist = dist;
      nearestRow = row;
    }
  }

  const holePos = getHolePos(nearestRow, col);
  const holeDist = Math.hypot(holePos.x - x, holePos.y - y);

  // Nearest Arduino pin
  let nearestPin = null;
  let nearestPinDist = Infinity;
  for (const pin of ARDUINO_PINS) {
    const dist = Math.hypot(pin.x - x, pin.y - y);
    if (dist < nearestPinDist) {
      nearestPinDist = dist;
      nearestPin = pin;
    }
  }

  if (nearestPin && nearestPinDist < holeDist) {
    return { pin: nearestPin.id };
  }
  return { row: nearestRow, col };
}
