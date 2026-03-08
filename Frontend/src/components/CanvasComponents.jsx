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

function Led({ s, e, simState }) {
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
  const state = simState?.state ?? 'off';
  const brightness = simState?.brightness ?? 1.0;

  if (state === 'blown') {
    return (
      <g>
        <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#4b5563" strokeWidth={2} strokeLinecap="round" />
        <circle cx={mx} cy={my} r={9} fill="#374151" opacity={0.5} />
        <circle cx={mx} cy={my} r={5} fill="#6b7280" stroke="#4b5563" strokeWidth={1} />
        {/* X mark */}
        <line x1={mx - 4} y1={my - 4} x2={mx + 4} y2={my + 4} stroke="#dc2626" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={mx + 4} y1={my - 4} x2={mx - 4} y2={my + 4} stroke="#dc2626" strokeWidth={1.5} strokeLinecap="round" />
      </g>
    );
  }

  if (state === 'on') {
    const alpha = Math.round(brightness * 255).toString(16).padStart(2, '0');
    return (
      <g>
        <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
        <circle cx={mx} cy={my} r={18} fill={`#ef4444${alpha}`} opacity={0.25 * brightness} />
        <circle cx={mx} cy={my} r={11} fill="#fca5a5" opacity={0.55 * brightness} />
        <circle cx={mx} cy={my} r={5} fill="#fff" stroke="#ef4444" strokeWidth={1.5} />
      </g>
    );
  }

  if (state === 'blinking') {
    const onMs  = simState?.on_ms  ?? 500;
    const offMs = simState?.off_ms ?? 500;
    const totalMs = onMs + offMs;
    // on% = fraction of cycle the LED is lit
    const onPct  = Math.round((onMs  / totalMs) * 100);
    const offPct = 100 - onPct;
    // Unique animation name per LED position to avoid conflicts
    const animName = `led-blink-${Math.round(mx)}-${Math.round(my)}`;
    return (
      <g>
        <style>{`
          @keyframes ${animName} {
            0%        { opacity: 1; }
            ${onPct}% { opacity: 1; }
            ${onPct + 0.1}% { opacity: 0; }
            ${100 - offPct + onPct}% { opacity: 0; }
            100%      { opacity: 1; }
          }
        `}</style>
        <g style={{ animation: `${animName} ${totalMs}ms step-start infinite` }}>
          <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
          <circle cx={mx} cy={my} r={18} fill="#ef4444" opacity={0.25} />
          <circle cx={mx} cy={my} r={11} fill="#fca5a5" opacity={0.55} />
          <circle cx={mx} cy={my} r={5} fill="#fff" stroke="#ef4444" strokeWidth={1.5} />
        </g>
        <g style={{ animation: `${animName} ${totalMs}ms step-start infinite`, animationDelay: `${onMs}ms` }}>
          <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#dc2626" strokeWidth={2} strokeLinecap="round" />
          <circle cx={mx} cy={my} r={9} fill="#ef4444" opacity={0.18} />
          <circle cx={mx} cy={my} r={5} fill="#ef4444" stroke="#991b1b" strokeWidth={1} />
        </g>
      </g>
    );
  }

  // Default: off
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

// Led needs special treatment (simState prop), others are straightforward
const SHAPES = { wire: Wire, resistor: Resistor, battery: Battery };

// Component types whose endpoints can be dragged individually
const ENDPOINT_DRAGGABLE = new Set(['led', 'resistor', 'wire', 'battery']);

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

export default function CanvasComponents({ components, selectedId, editMode, onMouseDown, onComponentClick, onEndpointMouseDown, simulationStates }) {
  return (
    <g>
      {components.map(comp => {
        const s = resolveEndpoint(comp.start);
        const e = resolveEndpoint(comp.end);
        const isSelected = comp.id === selectedId;

        const Shape = comp.type === 'led'
          ? <Led s={s} e={e} simState={simulationStates?.[comp.id]} />
          : (() => { const S = SHAPES[comp.type] ?? Wire; return <S s={s} e={e} />; })();

        return (
          <g key={comp.id}>
            {isSelected && <SelectionRing s={s} e={e} />}
            {Shape}

            {/* Wide transparent hit area — always present so you can select in edit mode */}
            {editMode && (
              <line
                x1={s.x} y1={s.y} x2={e.x} y2={e.y}
                stroke="transparent" strokeWidth={18}
                style={{ cursor: 'pointer' }}
                onMouseDown={ev => onMouseDown(ev, comp)}
                onClick={ev => onComponentClick(ev, comp.id)}
              />
            )}

            {/* Draggable endpoint handles for LED and Resistor */}
            {isSelected && ENDPOINT_DRAGGABLE.has(comp.type) && (
              <>
                <circle
                  cx={s.x} cy={s.y} r={7}
                  fill="#fbbf24" stroke="#fff" strokeWidth={1.5}
                  style={{ cursor: 'crosshair' }}
                  onMouseDown={ev => { ev.stopPropagation(); onEndpointMouseDown(ev, comp.id, 'start'); }}
                  onClick={ev => ev.stopPropagation()}
                />
                <circle
                  cx={e.x} cy={e.y} r={7}
                  fill="#fbbf24" stroke="#fff" strokeWidth={1.5}
                  style={{ cursor: 'crosshair' }}
                  onMouseDown={ev => { ev.stopPropagation(); onEndpointMouseDown(ev, comp.id, 'end'); }}
                  onClick={ev => ev.stopPropagation()}
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
