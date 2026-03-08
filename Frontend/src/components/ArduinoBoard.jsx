// Simple Arduino UNO — flat square, all pins along the top edge.
import {
  ARDUINO_X, ARDUINO_Y,
  ARDUINO_WIDTH, ARDUINO_HEIGHT,
  ARDUINO_PINS,
} from '../utils/arduinoCoords.js';

const GROUP_COLOR = { power: '#ef4444', digital: '#60a5fa', analog: '#4ade80' };
const GROUP_LABEL_Y = ARDUINO_Y + ARDUINO_HEIGHT * 0.38;

export default function ArduinoBoard({
  editMode   = false,
  pendingPoint = null,
  hoveredPin  = null,
  onPinClick,
  onPinHover,
}) {
  return (
    <g>
      {/* ── PCB body ── */}
      <rect
        x={ARDUINO_X} y={ARDUINO_Y}
        width={ARDUINO_WIDTH} height={ARDUINO_HEIGHT}
        rx={6} fill="#1a6b5a" stroke="#0d4a3f" strokeWidth={1.5}
      />

      {/* Board label */}
      <text
        x={ARDUINO_X + ARDUINO_WIDTH / 2} y={ARDUINO_Y + ARDUINO_HEIGHT * 0.68}
        fontSize={15} fill="#4ade80" fontFamily="monospace" fontWeight="bold"
        textAnchor="middle"
      >
        Arduino UNO
      </text>

      {/* Group section labels */}
      {[
        { name: 'power',   label: 'POWER'   },
        { name: 'digital', label: 'DIGITAL' },
        { name: 'analog',  label: 'ANALOG'  },
      ].map(({ name, label }) => {
        const groupPins = ARDUINO_PINS.filter(p => p.group === name);
        if (!groupPins.length) return null;
        const gx = (groupPins[0].x + groupPins[groupPins.length - 1].x) / 2;
        return (
          <text key={name} x={gx} y={GROUP_LABEL_Y}
            fontSize={7} fill={GROUP_COLOR[name]} textAnchor="middle"
            fontFamily="monospace" opacity={0.75}
          >
            {label}
          </text>
        );
      })}

      {/* ── Pins ── */}
      {ARDUINO_PINS.map(pin => {
        const isHovered = hoveredPin === pin.id;
        const isPending = pendingPoint?.pin === pin.id;

        return (
          <g key={pin.id}>
            {/* Socket rectangle inside the board */}
            <rect
              x={pin.x - 4} y={ARDUINO_Y + 6}
              width={8} height={12}
              rx={2} fill="#111827" stroke="#374151" strokeWidth={0.5}
            />

            {/* Connection dot at the top edge */}
            <circle
              cx={pin.x} cy={ARDUINO_Y}
              r={isPending ? 5 : 3.5}
              fill={isPending ? '#fbbf24' : pin.color}
              stroke="#0d4a3f" strokeWidth={0.8}
            />

            {/* Hover / pending ring */}
            {(isHovered || isPending) && (
              <circle
                cx={pin.x} cy={ARDUINO_Y} r={9}
                fill="rgba(251,191,36,0.25)" pointerEvents="none"
              />
            )}

            {/* Invisible hit area */}
            {editMode && (
              <circle
                cx={pin.x} cy={ARDUINO_Y} r={10}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onClick={e => { e.stopPropagation(); onPinClick?.({ pin: pin.id }); }}
                onMouseEnter={() => onPinHover?.(pin.id)}
                onMouseLeave={() => onPinHover?.(null)}
              />
            )}

            {/* Pin label rotated inside the board */}
            <text
              x={pin.x} y={ARDUINO_Y + 30}
              fontSize={6} fill="#d1fae5" textAnchor="middle"
              fontFamily="monospace"
              transform={`rotate(-60, ${pin.x}, ${ARDUINO_Y + 30})`}
            >
              {pin.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
