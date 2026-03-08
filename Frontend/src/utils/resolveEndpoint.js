import { getHolePos } from './boardCoords.js';
import { getPinById } from './arduinoCoords.js';

// Converts a circuit endpoint ({ row, col } or { pin }) to pixel { x, y }
export function resolveEndpoint(ep) {
  if (!ep) return { x: 0, y: 0 };
  if ('row' in ep) return getHolePos(ep.row, ep.col);
  if ('pin' in ep) {
    const p = getPinById(ep.pin);
    return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
  }
  return { x: 0, y: 0 };
}
