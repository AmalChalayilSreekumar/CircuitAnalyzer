import {
  PITCH,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BOARD_PADDING_X,
  COLS,
  ALL_ROWS,
  POWER_ROWS,
  TOP_MAIN_ROWS,
  BOTTOM_MAIN_ROWS,
  getHoleX,
  getHoleY,
} from '../utils/boardCoords.js';

const HOLE_R = 2.8;
const SEC_X0 = BOARD_PADDING_X - 14;
const SEC_X1 = BOARD_PADDING_X + (COLS - 1) * PITCH + 14;
const SEC_W  = SEC_X1 - SEC_X0;

// ── Power rail colored line ──────────────────────────────────────────────────
function RailLine({ row }) {
  const y = getHoleY(row);
  const isPos = row === 'w' || row === 'y';
  return (
    <line
      x1={SEC_X0} y1={y} x2={SEC_X1} y2={y}
      stroke={isPos ? '#dc2626' : '#1d4ed8'}
      strokeWidth={1.4}
      opacity={0.55}
    />
  );
}

// ── Holes for one row ────────────────────────────────────────────────────────
function RowHoles({ row, editMode, pendingPoint, hoveredHole, onHoleClick, onHoleHover }) {
  const y = getHoleY(row);
  return (
    <>
      {Array.from({ length: COLS }, (_, i) => {
        const col = i + 1;
        const isHovered  = hoveredHole?.row  === row && hoveredHole?.col  === col;
        const isPending  = pendingPoint?.row  === row && pendingPoint?.col === col;
        return (
          <g key={i}>
            <circle
              cx={getHoleX(col)} cy={y}
              r={isPending ? 4.5 : HOLE_R}
              fill={isPending ? '#fbbf24' : (isHovered && editMode ? '#4b5563' : '#1e293b')}
              stroke={isPending ? '#fbbf24' : '#0f172a'}
              strokeWidth={0.4}
            />
            {editMode && (
              <circle
                cx={getHoleX(col)} cy={y} r={9}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onClick={e => { e.stopPropagation(); onHoleClick?.({ row, col }); }}
                onMouseEnter={() => onHoleHover?.({ row, col })}
                onMouseLeave={() => onHoleHover?.(null)}
              />
            )}
          </g>
        );
      })}
    </>
  );
}

// ── Main Breadboard (renders as <g> so it shares the parent SVG) ─────────────
export default function Breadboard({
  editMode     = false,
  pendingPoint = null,
  hoveredHole  = null,
  onHoleClick,
  onHoleHover,
}) {
  const topRailY1 = getHoleY('w') - PITCH * 0.58;
  const topRailY2 = getHoleY('x') + PITCH * 0.58;
  const topMainY1 = getHoleY('a') - PITCH * 0.52;
  const topMainY2 = getHoleY('e') + PITCH * 0.52;
  const botMainY1 = getHoleY('f') - PITCH * 0.52;
  const botMainY2 = getHoleY('j') + PITCH * 0.52;
  const botRailY1 = getHoleY('y') - PITCH * 0.58;
  const botRailY2 = getHoleY('z') + PITCH * 0.58;

  return (
    <g>
      {/* Board body — off-white / cream */}
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx={10}
        fill="#ede9e1" stroke="#c5bfb3" strokeWidth={1.5} />

      {/* Main section panels */}
      <rect x={SEC_X0} y={topMainY1} width={SEC_W} height={topMainY2 - topMainY1}
        rx={4} fill="#e2ddd5" />
      <rect x={SEC_X0} y={botMainY1} width={SEC_W} height={botMainY2 - botMainY1}
        rx={4} fill="#e2ddd5" />

      {/* Power rail panels */}
      <rect x={SEC_X0} y={topRailY1} width={SEC_W} height={topRailY2 - topRailY1}
        rx={3} fill="#f0ece4" stroke="#d4cec6" strokeWidth={0.6} />
      <rect x={SEC_X0} y={botRailY1} width={SEC_W} height={botRailY2 - botRailY1}
        rx={3} fill="#f0ece4" stroke="#d4cec6" strokeWidth={0.6} />

      {/* Red / blue rail lines */}
      {POWER_ROWS.map(row => <RailLine key={row} row={row} />)}

      {/* Column numbers */}
      {Array.from({ length: COLS }, (_, i) => {
        const col = i + 1;
        if (col % 5 !== 0 && col !== 1) return null;
        return (
          <g key={col}>
            <text x={getHoleX(col)} y={topMainY1 - 5}
              fontSize={7} fill="#9ca3af" textAnchor="middle" fontFamily="monospace">
              {col}
            </text>
            <text x={getHoleX(col)} y={botMainY2 + 12}
              fontSize={7} fill="#9ca3af" textAnchor="middle" fontFamily="monospace">
              {col}
            </text>
          </g>
        );
      })}

      {/* All holes */}
      {ALL_ROWS.map(row => (
        <RowHoles
          key={row}
          row={row}
          editMode={editMode}
          pendingPoint={pendingPoint}
          hoveredHole={hoveredHole}
          onHoleClick={onHoleClick}
          onHoleHover={onHoleHover}
        />
      ))}

      {/* Row labels a-e / f-j — left */}
      {[...TOP_MAIN_ROWS, ...BOTTOM_MAIN_ROWS].map(row => (
        <text key={`lL-${row}`} x={SEC_X0 - 7} y={getHoleY(row) + 3.5}
          fontSize={8} fill="#6b7280" textAnchor="middle" fontFamily="monospace">
          {row}
        </text>
      ))}

      {/* Row labels — right */}
      {[...TOP_MAIN_ROWS, ...BOTTOM_MAIN_ROWS].map(row => (
        <text key={`lR-${row}`} x={SEC_X1 + 7} y={getHoleY(row) + 3.5}
          fontSize={8} fill="#6b7280" textAnchor="middle" fontFamily="monospace">
          {row}
        </text>
      ))}

      {/* Power rail +/− labels — left */}
      {POWER_ROWS.map(row => {
        const isPos = row === 'w' || row === 'y';
        return (
          <text key={`pL-${row}`} x={SEC_X0 - 7} y={getHoleY(row) + 4}
            fontSize={10} textAnchor="middle" fontFamily="monospace" fontWeight="bold"
            fill={isPos ? '#dc2626' : '#1d4ed8'}>
            {isPos ? '+' : '−'}
          </text>
        );
      })}

      {/* Power rail +/− labels — right */}
      {POWER_ROWS.map(row => {
        const isPos = row === 'w' || row === 'y';
        return (
          <text key={`pR-${row}`} x={SEC_X1 + 7} y={getHoleY(row) + 4}
            fontSize={10} textAnchor="middle" fontFamily="monospace" fontWeight="bold"
            fill={isPos ? '#dc2626' : '#1d4ed8'}>
            {isPos ? '+' : '−'}
          </text>
        );
      })}
    </g>
  );
}
