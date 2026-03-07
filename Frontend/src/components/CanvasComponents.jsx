// Renders all circuit components as SVG elements with edit-mode interactivity.
import { resolveEndpoint } from '../utils/resolveEndpoint.js';

// ── Shape renderers ────────────────────────────────────────────────────────────

function Wire({ s, e }) {
  return (
    <line x1={s.x} y1={s.y} x2={e.x} y2={e.y}
      stroke="#6b7280" strokeWidth={2.5} strokeLinecap="round" />
  );
}

function Resistor({ s, e }) {
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
  const horiz = Math.abs(e.x - s.x) >= Math.abs(e.y - s.y);
  const bw = horiz ? Math.abs(e.x - s.x) * 0.45 : 9;
  const bh = horiz ? 9 : Math.abs(e.y - s.y) * 0.45;
  return (
    <g>
      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#92400e" strokeWidth={2} strokeLinecap="round" />
      <rect x={mx - bw / 2} y={my - bh / 2} width={bw} height={bh}
        rx={2} fill="#d97706" stroke="#92400e" strokeWidth={1} />
    </g>
  );
}

function Led({ s, e }) {
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
  return (
    <g>
      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#dc2626" strokeWidth={2} strokeLinecap="round" />
      <circle cx={mx} cy={my} r={9} fill="#ef4444" opacity={0.18} />
      <circle cx={mx} cy={my} r={5} fill="#ef4444" stroke="#991b1b" strokeWidth={1} />
    </g>
  );
}

function Battery({ s, e }) {
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
  const horiz = Math.abs(e.x - s.x) >= Math.abs(e.y - s.y);
  return (
    <g>
      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#374151" strokeWidth={2} strokeLinecap="round" />
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

const SHAPES = { wire: Wire, resistor: Resistor, led: Led, battery: Battery };

// ── Selection highlight ────────────────────────────────────────────────────────

function SelectionRing({ s, e }) {
  const pad = 10;
  const x = Math.min(s.x, e.x) - pad;
  const y = Math.min(s.y, e.y) - pad;
  const w = Math.max(Math.abs(e.x - s.x) + pad * 2, pad * 2);
  const h = Math.max(Math.abs(e.y - s.y) + pad * 2, pad * 2);
  return (
    <rect x={x} y={y} width={w} height={h} rx={5}
      fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5 3"
      pointerEvents="none"
    />
  );
}

// ── Wire preview (during placement) ───────────────────────────────────────────

export function WirePreview({ start, toBoard }) {
  if (!start || !toBoard) return null;
  const s = resolveEndpoint(start);
  return (
    <line
      x1={s.x} y1={s.y} x2={toBoard.x} y2={toBoard.y}
      stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 4"
      strokeLinecap="round" pointerEvents="none"
    />
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function CanvasComponents({ components, selectedId, editMode, onMouseDown, onComponentClick }) {
  return (
    <g>
      {components.map(comp => {
        const s = resolveEndpoint(comp.start);
        const e = resolveEndpoint(comp.end);
        const Shape = SHAPES[comp.type] ?? Wire;
        const isSelected = comp.id === selectedId;

        return (
          <g key={comp.id}>
            {isSelected && <SelectionRing s={s} e={e} />}
            <Shape s={s} e={e} />

            {/* Wide transparent hit area — always present so you can select in edit mode */}
            {editMode && (
              <line
                x1={s.x} y1={s.y} x2={e.x} y2={e.y}
                stroke="transparent" strokeWidth={18}
                style={{ cursor: 'move' }}
                onMouseDown={ev => onMouseDown(ev, comp)}
                onClick={ev => onComponentClick(ev, comp.id)}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
