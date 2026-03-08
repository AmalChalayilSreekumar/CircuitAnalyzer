const ITEMS = [
  {
    type: 'wire',
    label: 'Wire',
    icon: (
      <svg viewBox="0 0 32 32" className="w-6 h-6">
        <line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'resistor',
    label: 'Resistor',
    icon: (
      <svg viewBox="0 0 32 32" className="w-6 h-6">
        <line x1="4" y1="16" x2="28" y2="16" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="10" y="11" width="12" height="10" rx="2" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: 'led',
    label: 'LED',
    icon: (
      <svg viewBox="0 0 32 32" className="w-6 h-6">
        <line x1="4" y1="16" x2="28" y2="16" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="16" r="5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="8" fill="#ef4444" opacity="0.2" />
      </svg>
    ),
  },
  {
    type: 'switch',
    label: 'Switch',
    icon: (
      <svg viewBox="0 0 32 32" className="w-6 h-6">
        <line x1="4" y1="16" x2="11" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="21" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="11" cy="16" r="2.5" fill="#f59e0b" />
        <circle cx="21" cy="16" r="2.5" fill="#f59e0b" />
        <line x1="11" y1="16" x2="20" y2="9" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'battery',
    label: 'Battery',
    icon: (
      <svg viewBox="0 0 32 32" className="w-6 h-6">
        <line x1="4" y1="16" x2="28" y2="16" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="14" y1="9"  x2="14" y2="23" stroke="#374151" strokeWidth="3.5" />
        <line x1="18" y1="12" x2="18" y2="20" stroke="#374151" strokeWidth="2" />
      </svg>
    ),
  },
];

export default function ComponentPalette({ selected, onSelect }) {
  return (
    <div className="flex flex-col gap-1 w-16 shrink-0 bg-gray-900 border-r border-gray-800 py-3 px-1.5 items-center">
      <p className="text-gray-600 text-xs mb-2 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', fontSize: 9 }}>
        Components
      </p>

      {ITEMS.map(item => (
        <button
          key={item.type}
          title={item.label}
          onClick={() => onSelect(selected === item.type ? null : item.type)}
          className={[
            'flex flex-col items-center gap-1 w-full py-2 px-1 rounded-lg text-center transition-all',
            selected === item.type
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white',
          ].join(' ')}
        >
          {item.icon}
          <span className="text-xs leading-none" style={{ fontSize: 9 }}>{item.label}</span>
        </button>
      ))}

      <div className="w-6 border-t border-gray-700 my-1" />

      {/* Delete hint */}
      <div className="text-gray-600 text-center mt-1" style={{ fontSize: 9 }}>
        Del<br />to<br />delete
      </div>
    </div>
  );
}
