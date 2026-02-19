'use client';

interface TopNavProps {
  userEmail: string;
  isAdmin: boolean;
  darkMode: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
}

export default function TopNav({ userEmail, isAdmin, darkMode, onToggleDark, onSignOut }: TopNavProps) {
  return (
    <nav className={`h-14 flex items-center justify-between px-5 border-b shrink-0 backdrop-blur-md z-30 sticky top-0 ${
      darkMode
        ? 'bg-surface-1/80 border-white/5'
        : 'bg-white/80 border-slate-200'
    }`}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shadow-md shadow-brand-900/40">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <span className={`font-display text-base tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            VerifiedMeasure
          </span>
          {isAdmin && (
            <span className="ml-2 text-xs bg-brand-600/20 text-brand-400 border border-brand-500/30 rounded px-1.5 py-0.5">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            darkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Toggle dark mode"
        >
          {darkMode ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* User */}
        <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 ${
          darkMode ? 'border-white/10 bg-surface-2' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-xs text-white font-semibold">
            {userEmail[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className={`text-sm hidden sm:block max-w-[140px] truncate ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
            {userEmail}
          </span>
        </div>

        <button
          onClick={onSignOut}
          className={`text-sm px-3 py-1.5 rounded-xl transition-colors ${
            darkMode
              ? 'text-white/50 hover:text-white hover:bg-white/5'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
