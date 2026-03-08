import { useRef, useState, useCallback, useEffect } from 'react';
import Breadboard from './Breadboard.jsx';
import ArduinoBoard from './ArduinoBoard.jsx';
import CanvasComponents, { WirePreview } from './CanvasComponents.jsx';
import ComponentPalette from './ComponentPalette.jsx';
import PropertyPanel from './PropertyPanel.jsx';
import CommentPin from './CommentPin.jsx';
import CommentForm from './CommentForm.jsx';
import CommentPopup from './CommentPopup.jsx';
import { BOARD_WIDTH } from '../utils/boardCoords.js';
import { SVG_HEIGHT } from '../utils/arduinoCoords.js';
import { resolveEndpoint } from '../utils/resolveEndpoint.js';
import { snapToEndpoint } from '../utils/snapToEndpoint.js';

const INITIAL_PAN = { x: 120, y: 80 };

export default function CircuitCanvas({ circuitJson, comments, commentMode, onAddComment, onCircuitChange, simulationStates }) {
  const containerRef = useRef(null);

  // ── Pan ──────────────────────────────────────────────────────────────────────
  const [pan, setPan] = useState(INITIAL_PAN);
  const isPanning = useRef(false);
  const panOrigin = useRef(null);

  // ── Components state ─────────────────────────────────────────────────────────
  const [components, setComponents] = useState(() =>
    circuitJson?.hardware?.components ?? []
  );

  // Track the last components array that came FROM the prop, so we can
  // skip echoing it back to the parent (avoids loops without dropping user edits).
  const lastPropComponentsRef = useRef(null);

  useEffect(() => {
    const incoming = circuitJson?.hardware?.components ?? [];
    lastPropComponentsRef.current = incoming;
    setComponents(incoming);
  }, [circuitJson]);

  // Notify parent whenever components change (from user edits, not from prop)
  useEffect(() => {
    if (components === lastPropComponentsRef.current) return; // prop echo — skip
    onCircuitChange?.({ hardware: { components } });
  }, [components]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edit / placement state ───────────────────────────────────────────────────
  const [selectedTool, setSelectedTool] = useState(null);   // 'wire'|'resistor'|etc
  const [pendingPoint, setPendingPoint] = useState(null);   // first endpoint clicked (single-step)
  const [pendingPoints, setPendingPoints] = useState([]);   // multi-step: rgb-led [r, g, b, ...]
  const [mousePos, setMousePos]         = useState(null);   // SVG coords for preview
  const [hoveredHole, setHoveredHole]   = useState(null);
  const [hoveredPin,  setHoveredPin]    = useState(null);

  // ── Selection ────────────────────────────────────────────────────────────────
  const [selectedCompId, setSelectedCompId] = useState(null);

  // ── Endpoint dragging ────────────────────────────────────────────────────────
  // Using a ref so mouse move handlers always see the latest value without stale closures
  const draggingEndpointRef = useRef(null); // { compId, which: 'start'|'end' } | null

  // ── Comment state ─────────────────────────────────────────────────────────────
  const [pendingPin,    setPendingPin]    = useState(null);
  const [activeComment, setActiveComment] = useState(null);

  const editMode  = selectedTool !== null;
  const anyMode   = editMode || commentMode;

  // ── Delete key ───────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCompId) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        setComponents(prev => prev.filter(c => c.id !== selectedCompId));
        setSelectedCompId(null);
      }
      if (e.key === 'Escape') {
        setSelectedTool(null);
        setPendingPoint(null);
        setPendingPoints([]);
        setSelectedCompId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCompId]);

  // ── Placement click ──────────────────────────────────────────────────────────
  const RGB_STEP_HINTS = ['R (red) pin', 'G (green) pin', 'B (blue) pin', 'Common (−) pin'];

  function handlePointClick(endpoint) {
    if (!editMode) return;

    if (selectedTool === 'rgb-led') {
      const next = [...pendingPoints, endpoint];
      setPendingPoint(endpoint); // keep latest for preview/highlight
      if (next.length < 4) {
        setPendingPoints(next);
      } else {
        const [r, g, b, common] = next;
        setComponents(prev => [
          ...prev,
          { id: `c${Date.now()}`, type: 'rgb-led', r, g, b, common },
        ]);
        setPendingPoints([]);
        setPendingPoint(null);
      }
      return;
    }

    if (!pendingPoint) {
      setPendingPoint(endpoint);
    } else {
      setComponents(prev => [
        ...prev,
        { id: `c${Date.now()}`, type: selectedTool, start: pendingPoint, end: endpoint },
      ]);
      setPendingPoint(null);
    }
  }

  // ── Endpoint drag start ──────────────────────────────────────────────────────
  function handleEndpointMouseDown(_e, compId, which) {
    // stopPropagation already called by the handle; just record the drag
    draggingEndpointRef.current = { compId, which };
  }

  // ── Pan handlers ─────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    if (anyMode || e.button !== 0 || draggingEndpointRef.current) return;
    isPanning.current = true;
    panOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function onMouseMove(e) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const bx = e.clientX - rect.left - pan.x;
    const by = e.clientY - rect.top  - pan.y;

    if (isPanning.current) {
      setPan({ x: e.clientX - panOrigin.current.x, y: e.clientY - panOrigin.current.y });
    }

    if (editMode) {
      setMousePos({ x: bx, y: by });
    }

    if (draggingEndpointRef.current) {
      const snapped = snapToEndpoint(bx, by);
      const { compId, which } = draggingEndpointRef.current;
      setComponents(prev => prev.map(c =>
        c.id === compId ? { ...c, [which]: snapped } : c
      ));
    }
  }

  function stopPan() {
    isPanning.current = false;
    draggingEndpointRef.current = null;
  }

  // ── Canvas click ─────────────────────────────────────────────────────────────
  const onCanvasClick = useCallback((e) => {
    if (editMode) return; // hole/pin clicks are handled separately
    if (activeComment) { setActiveComment(null); return; }
    setSelectedCompId(null);
    if (!commentMode) return;

    const rect = containerRef.current.getBoundingClientRect();
    const boardX  = e.clientX - rect.left - pan.x;
    const boardY  = e.clientY - rect.top  - pan.y;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    setPendingPin({ boardX, boardY, screenX, screenY });
  }, [editMode, commentMode, pan, activeComment]);

  // ── Comment helpers ───────────────────────────────────────────────────────────
  function handleSubmitComment(text) {
    onAddComment({ x: pendingPin.boardX, y: pendingPin.boardY, body: text });
    setPendingPin(null);
  }

  function boardToScreen(bx, by) {
    return { x: bx + pan.x, y: by + pan.y };
  }

  // ── Selected component ────────────────────────────────────────────────────────
  const selectedComp = components.find(c => c.id === selectedCompId) ?? null;
  const selectedScreenPos = selectedComp
    ? (() => {
        if (selectedComp.type === 'rgb-led') {
          const pts = ['r', 'g', 'b', 'common'].map(k => resolveEndpoint(selectedComp[k]));
          const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
          const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
          return boardToScreen(cx, cy);
        }
        const s = resolveEndpoint(selectedComp.start);
        const e = resolveEndpoint(selectedComp.end);
        return boardToScreen((s.x + e.x) / 2, (s.y + e.y) / 2);
      })()
    : null;

  // ── Pending wire preview start ────────────────────────────────────────────────
  const cursor = anyMode ? 'crosshair' : (isPanning.current ? 'grabbing' : 'grab');

  return (
    <div className="flex w-full h-full" style={{ background: '#111827' }}>

      {/* ── Left palette ── */}
      <ComponentPalette
        selected={selectedTool}
        onSelect={tool => {
          setSelectedTool(prev => prev === tool ? null : tool);
          setPendingPoint(null);
          setPendingPoints([]);
          setSelectedCompId(null);
        }}
      />

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="relative flex-1 h-full overflow-hidden select-none"
        style={{ cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopPan}
        onMouseLeave={stopPan}
        onClick={onCanvasClick}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            backgroundPosition: `${pan.x % 28}px ${pan.y % 28}px`,
          }}
        />

        {/* Pan container */}
        <div
          className="absolute"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, willChange: 'transform' }}
        >
          {/* Combined SVG — breadboard + arduino + components all in one coordinate space */}
          <svg
            width={BOARD_WIDTH}
            height={SVG_HEIGHT}
            style={{ display: 'block', userSelect: 'none', overflow: 'visible' }}
          >
            <Breadboard
              editMode={editMode}
              pendingPoint={pendingPoint}
              hoveredHole={hoveredHole}
              onHoleClick={handlePointClick}
              onHoleHover={setHoveredHole}
            />

            <ArduinoBoard
              editMode={editMode}
              pendingPoint={pendingPoint}
              hoveredPin={hoveredPin}
              onPinClick={handlePointClick}
              onPinHover={setHoveredPin}
            />

            {/* All placed components */}
            <CanvasComponents
              components={components}
              selectedId={selectedCompId}
              editMode={!editMode}   // allow selecting when no tool is active
              onMouseDown={() => {}}
              onComponentClick={(e, id) => {
                e.stopPropagation();
                const comp = components.find(c => c.id === id);
                if (comp?.type === 'switch') {
                  setComponents(prev => prev.map(c => c.id === id ? { ...c, closed: !c.closed } : c));
                } else {
                  setSelectedCompId(prev => prev === id ? null : id);
                }
              }}
              onEndpointMouseDown={handleEndpointMouseDown}
              simulationStates={simulationStates}
            />

            {/* Rubber-band wire preview */}
            <WirePreview start={pendingPoint} toBoard={mousePos} />

            {/* Pending point highlight rings */}
            {selectedTool === 'rgb-led'
              ? pendingPoints.map((ep, i) => {
                  const pt = resolveEndpoint(ep);
                  const colors = ['#ef4444', '#22c55e', '#3b82f6', '#9ca3af'];
                  return (
                    <circle key={i}
                      cx={pt.x} cy={pt.y} r={8}
                      fill={`${colors[i]}55`} stroke={colors[i]} strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  );
                })
              : pendingPoint && (() => {
                  const pt = resolveEndpoint(pendingPoint);
                  return (
                    <circle
                      cx={pt.x} cy={pt.y} r={8}
                      fill="rgba(251,191,36,0.35)" stroke="#fbbf24" strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  );
                })()
            }
          </svg>

          {/* Comment pins (positioned in board space) */}
          {comments.map((comment, i) => (
            <CommentPin
              key={comment.id}
              comment={comment}
              index={i + 1}
              isSelected={activeComment?.id === comment.id}
              onClick={e => {
                e.stopPropagation();
                setPendingPin(null);
                setActiveComment(prev => prev?.id === comment.id ? null : comment);
              }}
            />
          ))}

          {/* Ghost pin while form is open */}
          {pendingPin && (
            <div
              className="absolute w-7 h-7 rounded-full bg-amber-400 border-2 border-amber-300 flex items-center justify-center text-xs font-bold text-amber-900 pointer-events-none"
              style={{ left: pendingPin.boardX - 14, top: pendingPin.boardY - 14 }}
            >
              +
            </div>
          )}
        </div>

        {/* CommentForm — screen space */}
        {pendingPin && (
          <CommentForm
            screenPos={{ x: pendingPin.screenX, y: pendingPin.screenY }}
            onSubmit={handleSubmitComment}
            onCancel={() => setPendingPin(null)}
          />
        )}

        {/* CommentPopup — screen space */}
        {activeComment && !pendingPin && (
          <CommentPopup
            comment={activeComment}
            screenPos={boardToScreen(activeComment.x_coord, activeComment.y_coord)}
            onClose={() => setActiveComment(null)}
          />
        )}

        {/* PropertyPanel for selected component */}
        {selectedComp && selectedScreenPos && (
          <PropertyPanel
            component={selectedComp}
            screenPos={selectedScreenPos}
            onChange={updated =>
              setComponents(prev => prev.map(c => c.id === updated.id ? updated : c))
            }
            onDelete={() => {
              setComponents(prev => prev.filter(c => c.id !== selectedCompId));
              setSelectedCompId(null);
            }}
            onClose={() => setSelectedCompId(null)}
          />
        )}

        {/* Status hints */}
        {editMode && (selectedTool === 'rgb-led' ? pendingPoints.length === 0 : !pendingPoint) && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
              {selectedTool === 'led'
                ? 'Click the anode (+) hole first · Esc to cancel'
                : selectedTool === 'rgb-led'
                ? `Click the ${RGB_STEP_HINTS[0]} · Esc to cancel`
                : selectedTool === 'switch'
                ? 'Click first hole to start placing the switch · Esc to cancel'
                : `Click a hole or pin to start placing a ${selectedTool} · Esc to cancel`}
            </span>
          </div>
        )}
        {editMode && (selectedTool === 'rgb-led' ? pendingPoints.length > 0 : !!pendingPoint) && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="bg-amber-500 text-amber-950 text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
              {selectedTool === 'rgb-led'
                ? `(${pendingPoints.length}/4) Now click the ${RGB_STEP_HINTS[pendingPoints.length]} · Esc to cancel`
                : selectedTool === 'led'
                ? 'Now click the cathode (−) hole · Esc to cancel'
                : 'Now click the second point · Esc to cancel'}
            </span>
          </div>
        )}
        {commentMode && !pendingPin && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="bg-amber-500 text-amber-950 text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
              Click anywhere to add a comment
            </span>
          </div>
        )}
        {!anyMode && !selectedComp && (
          <div className="absolute bottom-5 right-5 pointer-events-none">
            <span className="text-gray-600 text-xs">Drag to pan · Del to delete selected</span>
          </div>
        )}
      </div>
    </div>
  );
}
