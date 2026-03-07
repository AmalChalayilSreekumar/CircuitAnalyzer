import { useState, useEffect, useRef } from 'react';

export default function CommentForm({ screenPos, onSubmit, onCancel }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) onSubmit(text.trim());
    }
    if (e.key === 'Escape') onCancel();
  }

  // Keep popup inside viewport
  const LEFT_OFFSET = 18;
  const TOP_OFFSET = -8;

  return (
    <div
      className="absolute z-30 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ left: screenPos.x + LEFT_OFFSET, top: screenPos.y + TOP_OFFSET }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 pt-3 pb-1">
        <textarea
          ref={textareaRef}
          className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed"
          placeholder="Add a comment… (Enter to submit, Esc to cancel)"
          rows={3}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex items-center justify-end gap-2 px-3 pb-3">
        <button
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
          disabled={!text.trim()}
          onClick={() => onSubmit(text.trim())}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
