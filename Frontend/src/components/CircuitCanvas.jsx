import { useRef, useState, useCallback } from 'react';
import Breadboard from './Breadboard.jsx';
import CommentPin from './CommentPin.jsx';
import CommentForm from './CommentForm.jsx';
import CommentPopup from './CommentPopup.jsx';

const INITIAL_PAN = { x: 120, y: 80 };

export default function CircuitCanvas({ circuitJson, comments, commentMode, onAddComment }) {
  const containerRef = useRef(null);

  // Pan state
  const [pan, setPan] = useState(INITIAL_PAN);
  const isPanning = useRef(false);
  const panOrigin = useRef(null);

  // Comment UI state
  const [pendingPin, setPendingPin] = useState(null);  // { boardX, boardY, screenX, screenY }
  const [activeComment, setActiveComment] = useState(null); // comment object being viewed

  // ── Pan handlers ────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    if (commentMode || e.button !== 0) return;
    isPanning.current = true;
    panOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function onMouseMove(e) {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panOrigin.current.x, y: e.clientY - panOrigin.current.y });
  }

  function stopPan() {
    isPanning.current = false;
  }

  // ── Canvas click (comment placement) ────────────────────────────────────────
  const onCanvasClick = useCallback((e) => {
    // Dismiss active comment popup on any click
    if (activeComment) {
      setActiveComment(null);
      return;
    }
    if (!commentMode) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Position relative to the breadboard (pan container origin)
    const boardX = e.clientX - rect.left - pan.x;
    const boardY = e.clientY - rect.top - pan.y;
    // Screen position for the CommentForm popup
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    setPendingPin({ boardX, boardY, screenX, screenY });
  }, [commentMode, pan, activeComment]);

  function handleSubmitComment(text) {
    onAddComment({ x: pendingPin.boardX, y: pendingPin.boardY, body: text });
    setPendingPin(null);
  }

  function handleCancelComment() {
    setPendingPin(null);
  }

  // ── Comment pin click ────────────────────────────────────────────────────────
  function handlePinClick(e, comment) {
    e.stopPropagation();
    setPendingPin(null);
    setActiveComment(prev => prev?.id === comment.id ? null : comment);
  }

  // Screen position of a board-relative coordinate (for popups)
  function boardToScreen(bx, by) {
    return { x: bx + pan.x, y: by + pan.y };
  }

  const cursor = commentMode ? 'crosshair' : (isPanning.current ? 'grabbing' : 'grab');

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ cursor, background: '#111827' }}
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

      {/* Pan transform container — breadboard + pins share the same origin */}
      <div
        className="absolute"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, willChange: 'transform' }}
      >
        <Breadboard circuitJson={circuitJson} />

        {/* Existing comment pins */}
        {comments.map((comment, i) => (
          <CommentPin
            key={comment.id}
            comment={comment}
            index={i + 1}
            isSelected={activeComment?.id === comment.id}
            onClick={e => handlePinClick(e, comment)}
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

      {/* CommentForm — positioned in screen space */}
      {pendingPin && (
        <CommentForm
          screenPos={{ x: pendingPin.screenX, y: pendingPin.screenY }}
          onSubmit={handleSubmitComment}
          onCancel={handleCancelComment}
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

      {/* Comment mode hint */}
      {commentMode && !pendingPin && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="bg-amber-500 text-amber-950 text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
            Click anywhere on the circuit to add a comment
          </span>
        </div>
      )}

      {/* Pan hint (only on first load) */}
      {!commentMode && (
        <div className="absolute bottom-5 right-5 pointer-events-none">
          <span className="text-gray-600 text-xs">Drag to pan</span>
        </div>
      )}
    </div>
  );
}
