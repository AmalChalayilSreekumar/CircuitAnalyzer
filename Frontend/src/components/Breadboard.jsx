import {
  PITCH,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BOARD_PADDING_X,
  BOARD_PADDING_Y,
  COLS,
  ALL_ROWS,
  POWER_ROWS,
  TOP_MAIN_ROWS,
  BOTTOM_MAIN_ROWS,
  POWER_ROW_CONFIG,
  getHoleX,
  getHoleY,
  getHolePos,
} from '../utils/boardCoords.js';

const HOLE_R = 3.2;

// ── Rail background strip ────────────────────────────────────────────────────
function RailStrip({ row }) {
  const cfg = POWER_ROW_CONFIG[row];
  const y = getHoleY(row);
  const x0 = BOARD_PADDING_X - 10;
  const w = (COLS - 1) * PITCH + 20;
  return (
    <rect x={x0} y={y - 9} width={w} height={18} rx={4}
      fill={cfg.fill} stroke={cfg.stroke} strokeWidth={0.6} />
  );
}

// ── Holes for one row ────────────────────────────────────────────────────────
function RowHoles({ row }) {
  const y = getHoleY(row);
  const isPower = POWER_ROWS.includes(row);
  return (
    <>
      {Array.from({ length: COLS }, (_, i) => (
        <circle
          key={i}
          cx={getHoleX(i + 1)}
          cy={y}
          r={HOLE_R}
          fill={isPower ? '#fff' : '#111827'}
          stroke={isPower ? '#d1d5db' : '#374151'}
          strokeWidth={0.5}
        />
      ))}
    </>
  );
}

// ── Component renderers ──────────────────────────────────────────────────────
function Wire({ comp }) {
  const s = getHolePos(comp.start.row, comp.start.col);
  const e = getHolePos(comp.end.row, comp.end.col);
  return (
    <line x1={s.x} y1={s.y} x2={e.x} y2={e.y}
      stroke="#6b7280" strokeWidth={2.5} strokeLinecap="round" />
  );
}

function Resistor({ comp }) {
  const s = getHolePos(comp.start.row, comp.start.col);
  const e = getHolePos(comp.end.row, comp.end.col);
  const mx = (s.x + e.x) / 2;
  const my = (s.y + e.y) / 2;
  const horiz = Math.abs(e.x - s.x) >= Math.abs(e.y - s.y);
  const bw = horiz ? Math.abs(e.x - s.x) * 0.45 : 9;
  const bh = horiz ? 9 : Math.abs(e.y - s.y) * 0.45;
  return (
    <g>
      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y}
        stroke="#92400e" strokeWidth={2} strokeLinecap="round" />
      <rect x={mx - bw / 2} y={my - bh / 2} width={bw} height={bh} rx={2}
        fill="#d97706" stroke="#92400e" strokeWidth={1} />
    </g>
  );
}

function Led({ comp }) {
  const s = getHolePos(comp.start.row, comp.start.col);
  const e = getHolePos(comp.end.row, comp.end.col);
  const mx = (s.x + e.x) / 2;
  const my = (s.y + e.y) / 2;
  return (
    <g>
      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y}
        stroke="#dc2626" strokeWidth={2} strokeLinecap="round" />
      {/* glow */}
      <circle cx={mx} cy={my} r={9} fill="#ef4444" opacity={0.18} />
      {/* body */}
      <circle cx={mx} cy={my} r={5} fill="#ef4444" stroke="#991b1b" strokeWidth={1} />
    </g>
  );
}

function Battery({ comp }) {
  const s = getHolePos(comp.start.row, comp.start.col);
  const e = getHolePos(comp.end.row, comp.end.col);
  const mx = (s.x + e.x) / 2;
  const my = (s.y + e.y) / 2;
  const horiz = Math.abs(e.x - s.x) >= Math.abs(e.y - s.y);
  return (
    <g>
      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y}
        stroke="#374151" strokeWidth={2} strokeLinecap="round" />
      {horiz ? (
        <>
          <line x1={mx - 1} y1={my - 7} x2={mx - 1} y2={my + 7} stroke="#374151" strokeWidth={3} />
          <line x1={mx + 3} y1={my - 4} x2={mx + 3} y2={my + 4} stroke="#374151" strokeWidth={1.5} />
        </>
      ) : (
        <>
          <line x1={mx - 7} y1={my - 1} x2={mx + 7} y2={my - 1} stroke="#374151" strokeWidth={3} />
          <line x1={mx - 4} y1={my + 3} x2={mx + 4} y2={my + 3} stroke="#374151" strokeWidth={1.5} />
        </>
      )}
    </g>
  );
}

function Component({ comp }) {
  switch (comp.type) {
    case 'wire':     return <Wire comp={comp} />;
    case 'resistor': return <Resistor comp={comp} />;
    case 'led':      return <Led comp={comp} />;
    case 'battery':  return <Battery comp={comp} />;
    default:         return <Wire comp={comp} />;
  }
}

// ── Main Breadboard ──────────────────────────────────────────────────────────
export default function Breadboard({ circuitJson }) {
  const components = circuitJson?.hardware?.components ?? [];

  // Center divider strip between row e and row f
  const dividerY1 = getHoleY('e') + 11;
  const dividerY2 = getHoleY('f') - 11;
  const railX0 = BOARD_PADDING_X - 10;
  const railW = (COLS - 1) * PITCH + 20;

  return (
    <svg
      width={BOARD_WIDTH}
      height={BOARD_HEIGHT}
      style={{ display: 'block', userSelect: 'none' }}
    >
      {/* Board body */}
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx={10} fill="#1a5e3a" />

      {/* Column tick marks every 5 cols */}
      {Array.from({ length: COLS }, (_, i) => {
        const col = i + 1;
        if (col % 5 !== 0 && col !== 1 && col !== 63) return null;
        return (
          <text key={col} x={getHoleX(col)} y={BOARD_PADDING_Y - 12}
            fontSize={8} fill="#4ade80" textAnchor="middle" fontFamily="monospace">
            {col}
          </text>
        );
      })}

      {/* Rail strips */}
      {POWER_ROWS.map(row => <RailStrip key={row} row={row} />)}

      {/* Center divider */}
      <rect
        x={railX0} y={dividerY1}
        width={railW} height={dividerY2 - dividerY1}
        fill="#0f3d28"
      />

      {/* All holes */}
      {ALL_ROWS.map(row => <RowHoles key={row} row={row} />)}

      {/* Row labels (a-j) */}
      {[...TOP_MAIN_ROWS, ...BOTTOM_MAIN_ROWS].map(row => (
        <text key={row} x={BOARD_PADDING_X - 18} y={getHoleY(row) + 4}
          fontSize={9} fill="#86efac" textAnchor="middle" fontFamily="monospace">
          {row}
        </text>
      ))}

      {/* Power rail +/− labels */}
      {POWER_ROWS.map(row => {
        const cfg = POWER_ROW_CONFIG[row];
        return (
          <text key={row} x={BOARD_PADDING_X - 18} y={getHoleY(row) + 4}
            fontSize={10} textAnchor="middle" fontFamily="monospace" fontWeight="bold"
            fill={row === 'w' || row === 'y' ? '#fca5a5' : '#93c5fd'}>
            {cfg.label}
          </text>
        );
      })}

      {/* Circuit components */}
      {components.map(comp => <Component key={comp.id} comp={comp} />)}
    </svg>
  );
}
