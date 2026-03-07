// Renders the Arduino UNO as an SVG <g> positioned below the breadboard.
import {
  ARDUINO_X, ARDUINO_Y,
  ARDUINO_WIDTH, ARDUINO_HEIGHT,
  ARDUINO_PINS,
} from '../utils/arduinoCoords.js';

const USB_W = 30;
const USB_H = 22;

export default function ArduinoBoard({ editMode = false, hoveredPin = null, onPinClick, onPinHover }) {
  return (
    <g>
      {/* ── PCB body ── */}
      <rect
        x={ARDUINO_X} y={ARDUINO_Y}
        width={ARDUINO_WIDTH} height={ARDUINO_HEIGHT}
        rx={8} fill="#1a6b5a" stroke="#0d4a3f" strokeWidth={1.5}
      />

      {/* USB port (left side) */}
      <rect
        x={ARDUINO_X - USB_W + 4} y={ARDUINO_Y + (ARDUINO_HEIGHT - USB_H) / 2}
        width={USB_W} height={USB_H}
        rx={3} fill="#4b5563" stroke="#374151" strokeWidth={1}
      />
      <rect
        x={ARDUINO_X - USB_W + 8} y={ARDUINO_Y + (ARDUINO_HEIGHT - USB_H) / 2 + 4}
        width={USB_W - 12} height={USB_H - 8}
        rx={2} fill="#1f2937"
      />

      {/* Microcontroller chip */}
      <rect
        x={ARDUINO_X + ARDUINO_WIDTH * 0.42} y={ARDUINO_Y + ARDUINO_HEIGHT * 0.35}
        width={80} height={60}
        rx={3} fill="#111827" stroke="#374151" strokeWidth={1}
      />
      {/* Chip pins (decorative) */}
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={`lp${i}`}
          x={ARDUINO_X + ARDUINO_WIDTH * 0.42 - 4}
          y={ARDUINO_Y + ARDUINO_HEIGHT * 0.35 + 8 + i * 7}
          width={4} height={3} rx={1} fill="#6b7280"
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={`rp${i}`}
          x={ARDUINO_X + ARDUINO_WIDTH * 0.42 + 80}
          y={ARDUINO_Y + ARDUINO_HEIGHT * 0.35 + 8 + i * 7}
          width={4} height={3} rx={1} fill="#6b7280"
        />
      ))}

      {/* Crystal oscillator */}
      <rect
        x={ARDUINO_X + ARDUINO_WIDTH * 0.38} y={ARDUINO_Y + ARDUINO_HEIGHT * 0.45}
        width={22} height={12}
        rx={3} fill="#92400e" stroke="#78350f" strokeWidth={0.8}
      />

      {/* Board labels */}
      <text
        x={ARDUINO_X + ARDUINO_WIDTH * 0.15} y={ARDUINO_Y + ARDUINO_HEIGHT * 0.55}
        fontSize={13} fill="#4ade80" fontFamily="monospace" fontWeight="bold"
      >
        Arduino
      </text>
      <text
        x={ARDUINO_X + ARDUINO_WIDTH * 0.15} y={ARDUINO_Y + ARDUINO_HEIGHT * 0.75}
        fontSize={10} fill="#86efac" fontFamily="monospace"
      >
        UNO R3
      </text>

      {/* Power LED (small circle) */}
      <circle
        cx={ARDUINO_X + ARDUINO_WIDTH - 30} cy={ARDUINO_Y + ARDUINO_HEIGHT - 20}
        r={4} fill="#22c55e" opacity={0.9}
      />
      <text
        x={ARDUINO_X + ARDUINO_WIDTH - 30} y={ARDUINO_Y + ARDUINO_HEIGHT - 28}
        fontSize={6} fill="#86efac" textAnchor="middle" fontFamily="monospace"
      >
        ON
      </text>

      {/* ── Group label backgrounds ── */}
      {[
        { label: 'POWER',   x: ARDUINO_PINS.find(p => p.group === 'power')?.x,   color: '#ef4444' },
        { label: 'DIGITAL', x: ARDUINO_PINS.find(p => p.group === 'digital')?.x, color: '#60a5fa' },
        { label: 'ANALOG',  x: ARDUINO_PINS.find(p => p.group === 'analog')?.x,  color: '#4ade80' },
      ].map(({ label, x, color }) => x != null && (
        <text key={label} x={x} y={ARDUINO_Y + 8}
          fontSize={6} fill={color} fontFamily="monospace" opacity={0.7}>
          {label}
        </text>
      ))}

      {/* ── Pins ── */}
      {ARDUINO_PINS.map(pin => {
        const isHovered = hoveredPin === pin.id;
        return (
          <g key={pin.id}>
            {/* Pin socket (the hole on the board) */}
            <rect
              x={pin.x - 5} y={ARDUINO_Y + 10}
              width={10} height={14}
              rx={2} fill="#111827" stroke="#374151" strokeWidth={0.5}
            />
            {/* Pin hole dot */}
            <circle cx={pin.x} cy={ARDUINO_Y + 17} r={2.5} fill="#1f2937" />

            {/* Connection point (top edge of board, facing breadboard) */}
            <circle
              cx={pin.x} cy={pin.y}
              r={3} fill={pin.color} stroke="#111827" strokeWidth={0.8}
              opacity={0.9}
            />

            {/* Hover ring */}
            {isHovered && (
              <circle cx={pin.x} cy={pin.y} r={8} fill="rgba(251,191,36,0.35)" pointerEvents="none" />
            )}

            {/* Invisible hit area */}
            {editMode && (
              <circle
                cx={pin.x} cy={pin.y} r={9}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onClick={() => onPinClick?.(pin.id)}
                onMouseEnter={() => onPinHover?.(pin.id)}
                onMouseLeave={() => onPinHover?.(null)}
              />
            )}

            {/* Pin label (rotated, inside board) */}
            <text
              x={pin.x} y={ARDUINO_Y + 42}
              fontSize={6.5} fill="#d1fae5" textAnchor="middle"
              fontFamily="monospace"
              transform={`rotate(-65, ${pin.x}, ${ARDUINO_Y + 42})`}
            >
              {pin.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
