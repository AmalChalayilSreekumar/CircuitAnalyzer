import { BOARD_HEIGHT, BOARD_WIDTH } from './boardCoords.js';

export const ARDUINO_GAP    = 60;
export const ARDUINO_WIDTH  = 660;
export const ARDUINO_HEIGHT = 130;
export const ARDUINO_X      = Math.round((BOARD_WIDTH - ARDUINO_WIDTH) / 2);
export const ARDUINO_Y      = Math.round(BOARD_HEIGHT) + ARDUINO_GAP;

const P = 22; // pin pitch (matches breadboard)

// Pin groups in display order (left → right across the top of the board)
const PIN_GROUPS = [
  {
    name: 'power',
    pins: [
      { id: 'IOREF',    label: 'IOREF' },
      { id: 'RESET',    label: 'RST'   },
      { id: '3V3',      label: '3.3V'  },
      { id: '5V',       label: '5V'    },
      { id: 'GND1',     label: 'GND'   },
      { id: 'GND2',     label: 'GND'   },
      { id: 'VIN',      label: 'VIN'   },
    ],
  },
  {
    name: 'digital',
    pins: [
      { id: 'D0',     label: 'D0',   isPWM: false },
      { id: 'D1',     label: 'D1',   isPWM: false },
      { id: 'D2',     label: 'D2',   isPWM: false },
      { id: 'D3',     label: 'D3~',  isPWM: true  },
      { id: 'D4',     label: 'D4',   isPWM: false },
      { id: 'D5',     label: 'D5~',  isPWM: true  },
      { id: 'D6',     label: 'D6~',  isPWM: true  },
      { id: 'D7',     label: 'D7',   isPWM: false },
      { id: 'D8',     label: 'D8',   isPWM: false },
      { id: 'D9',     label: 'D9~',  isPWM: true  },
      { id: 'D10',    label: 'D10~', isPWM: true  },
      { id: 'D11',    label: 'D11~', isPWM: true  },
      { id: 'D12',    label: 'D12',  isPWM: false },
      { id: 'D13',    label: 'D13',  isPWM: false },
      { id: 'GND_D',  label: 'GND',  isPWM: false },
      { id: 'AREF',   label: 'AREF', isPWM: false },
    ],
  },
  {
    name: 'analog',
    pins: [
      { id: 'A0', label: 'A0' },
      { id: 'A1', label: 'A1' },
      { id: 'A2', label: 'A2' },
      { id: 'A3', label: 'A3' },
      { id: 'A4', label: 'A4' },
      { id: 'A5', label: 'A5' },
    ],
  },
];

// Total span from first to last pin
const totalPinSpan =
  PIN_GROUPS.reduce((sum, g) => sum + (g.pins.length - 1) * P, 0) +
  (PIN_GROUPS.length - 1) * P * 2; // gaps between groups = 2 * P each

const startX = ARDUINO_X + Math.round((ARDUINO_WIDTH - totalPinSpan) / 2);
const PIN_Y  = ARDUINO_Y + 16; // pin holes sit near the top edge

export const ARDUINO_PINS = [];
const GROUP_COLOR = { power: '#ef4444', digital: '#60a5fa', analog: '#4ade80' };

let x = startX;
PIN_GROUPS.forEach((group, gi) => {
  group.pins.forEach((pin) => {
    ARDUINO_PINS.push({
      ...pin,
      group: group.name,
      color: GROUP_COLOR[group.name],
      x: Math.round(x),
      y: PIN_Y,
    });
    x += P;
  });
  if (gi < PIN_GROUPS.length - 1) x += P * 2; // gap between groups
});

export function getPinById(id) {
  return ARDUINO_PINS.find(p => p.id === id) ?? null;
}

export const SVG_HEIGHT = ARDUINO_Y + ARDUINO_HEIGHT + 20;
