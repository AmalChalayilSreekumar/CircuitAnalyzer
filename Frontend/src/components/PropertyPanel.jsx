import { useState, useEffect, useRef } from 'react';

const TYPE_LABEL = { wire: 'Wire', resistor: 'Resistor', led: 'LED', battery: 'Battery' };

export default function PropertyPanel({ component, screenPos, onChange, onDelete, onClose }) {
  const [value, setValue] = useState(component?.value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(component?.value ?? '');
  }, [component?.id]);

  useEffect(() => {
    if (component?.type === 'resistor') inputRef.current?.focus();
  }, [component?.id, component?.type]);

  if (!component) return null;

  function handleValueCommit() {
    if (value.trim() && value !== component.value) {
      onChange({ ...component, value: value.trim() });
    }
  }

  // Keep panel inside viewport horizontally
  const left = Math.min(screenPos.x + 16, window.innerWidth - 220);
  const top  = screenPos.y - 70;

  return (
    <div
      className="absolute z-30 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl px-3 py-2.5 w-52 pointer-events-auto"
      style={{ left, top }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-300">
          {TYPE_LABEL[component.type] ?? component.type}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-900/30 transition-colors"
            onClick={onDelete}
          >
            Delete
          </button>
          <button
            className="text-gray-500 hover:text-gray-300 text-sm leading-none px-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {component.type === 'resistor' && (
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 shrink-0">Value</label>
          <input
            ref={inputRef}
            className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none border border-gray-700 focus:border-blue-500"
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={handleValueCommit}
            onKeyDown={e => {
              if (e.key === 'Enter') { handleValueCommit(); onClose(); }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="e.g. 220"
          />
          <span className="text-xs text-gray-400">Ω</span>
        </div>
      )}

      {component.type === 'wire' && (
        <p className="text-xs text-gray-500">Drag endpoints to reposition.</p>
      )}

      {component.type === 'led' && (
        <p className="text-xs text-gray-500">No editable properties.</p>
      )}

      {component.type === 'battery' && (
        <p className="text-xs text-gray-500">No editable properties.</p>
      )}
    </div>
  );
}
