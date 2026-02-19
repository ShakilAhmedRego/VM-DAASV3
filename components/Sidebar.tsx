'use client';

type Panel = 'browser' | 'transactions' | 'analytics';

interface SidebarProps {
  activePanel: Panel;
  onSelect: (panel: Panel) => void;
}

const items: { id: Panel; icon: React.ReactNode; label: string }[] = [
  {
    id: 'browser',
    label: 'Leads',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    label: 'Ledger',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Sidebar({ activePanel, onSelect }: SidebarProps) {
  return (
    <aside className="w-14 flex flex-col items-center py-4 gap-1 border-r border-white/5 bg-surface-1/50 shrink-0">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          title={item.label}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative ${
            activePanel === item.id
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
              : 'text-white/30 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          {item.icon}
          <span className="absolute left-14 bg-surface-2 border border-white/10 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
            {item.label}
          </span>
        </button>
      ))}
    </aside>
  );
}
