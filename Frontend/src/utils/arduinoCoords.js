import { BOARD_HEIGHT, BOARD_WIDTH } from './boardCoords.js';

export const ARDUINO_GAP    = 50;
export const ARDUINO_WIDTH  = 800;
export const ARDUINO_HEIGHT = 90;
export const ARDUINO_X      = Math.round((BOARD_WIDTH - ARDUINO_WIDTH) / 2);
export const ARDUINO_Y      = Math.round(BOARD_HEIGHT) + ARDUINO_GAP;

const P = 22; // pin pitch (matches breadboard)

const PIN_GROUPS = [
  {
    name: 'power',
    pins: [
      { id: 'IOREF', label: 'IOREF' },
      { id: 'RESET', label: 'RST'   },
      { id: '3V3',   label: '3.3V'  },
      { id: '5V',    label: '5V'    },
      { id: 'GND',   label: 'GND'   },
      { id: 'GND2',  label: 'GND'   },
      { id: 'VIN',   label: 'VIN'   },
    ],
  },
  {
    name: 'digital',
    pins: [
      { id: 'D0',    label: 'D0'    },
      { id: 'D1',    label: 'D1'    },
      { id: 'D2',    label: 'D2'    },
      { id: 'D3',    label: 'D3~'   },
      { id: 'D4',    label: 'D4'    },
      { id: 'D5',    label: 'D5~'   },
      { id: 'D6',    label: 'D6~'   },
      { id: 'D7',    label: 'D7'    },
      { id: 'D8',    label: 'D8'    },
      { id: 'D9',    label: 'D9~'   },
      { id: 'D10',   label: 'D10~'  },
      { id: 'D11',   label: 'D11~'  },
      { id: 'D12',   label: 'D12'   },
      { id: 'D13',   label: 'D13'   },
      { id: 'GND_D', label: 'GND'   },
      { id: 'AREF',  label: 'AREF'  },
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

const totalPinSpan =
  PIN_GROUPS.reduce((sum, g) => sum + (g.pins.length - 1) * P, 0) +
  (PIN_GROUPS.length - 1) * P * 2;

const startX = ARDUINO_X + Math.round((ARDUINO_WIDTH - totalPinSpan) / 2);

// Pin connection points sit at the very top edge of the board (faces breadboard)
const PIN_Y = ARDUINO_Y;

export const ARDUINO_PINS = [];
const GROUP_COLOR = { power: '#ef4444', digital: '#60a5fa', analog: '#4ade80' };

let x = startX;
PIN_GROUPS.forEach((group, gi) => {
  group.pins.forEach(pin => {
    ARDUINO_PINS.push({
      ...pin,
      group: group.name,
      color: GROUP_COLOR[group.name],
      x: Math.round(x),
      y: PIN_Y,
    });
    x += P;
  });
  if (gi < PIN_GROUPS.length - 1) x += P * 2;
});

export function getPinById(id) {
  return ARDUINO_PINS.find(p => p.id === id) ?? null;
}

export function getPinPos(pinId) {
  const pin = ARDUINO_PINS.find(p => p.id === pinId);
  return pin ? { x: pin.x, y: pin.y } : null;
}

export const SVG_HEIGHT = ARDUINO_Y + ARDUINO_HEIGHT + 30;
