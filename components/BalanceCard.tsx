'use client';

interface BalanceCardProps {
  balance: number;
  loading: boolean;
  entitledCount: number;
  totalLeads: number;
  darkMode: boolean;
}

export default function BalanceCard({ balance, loading, entitledCount, totalLeads, darkMode }: BalanceCardProps) {
  const card = darkMode
    ? 'bg-surface-2 border border-white/6 rounded-2xl p-5'
    : 'bg-white border border-slate-200 rounded-2xl p-5 shadow-sm';

  const label = darkMode ? 'text-white/40' : 'text-slate-400';
  const value = darkMode ? 'text-white' : 'text-slate-900';

  return (
    <div className={card}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className={`text-xs uppercase tracking-wider font-medium mb-1 ${label}`}>Token Balance</p>
          <p className={`text-xs ${label}`}>1 token = 1 new lead access</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          balance > 0
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {balance > 0 ? 'Active' : 'Empty'}
        </span>
      </div>

      {loading ? (
        <div className="h-10 rounded-xl skeleton mb-4" />
      ) : (
        <p className={`font-display text-5xl tracking-tight mb-5 ${value}`}>
          {balance.toLocaleString()}
        </p>
      )}

      <div className={`grid grid-cols-2 gap-3 pt-4 border-t ${darkMode ? 'border-white/6' : 'border-slate-100'}`}>
        <div>
          <p className={`text-xs ${label} mb-0.5`}>Entitled leads</p>
          {loading ? (
            <div className="h-5 w-16 rounded skeleton" />
          ) : (
            <p className={`font-semibold text-sm ${value}`}>{entitledCount.toLocaleString()}</p>
          )}
        </div>
        <div>
          <p className={`text-xs ${label} mb-0.5`}>Pool size</p>
          {loading ? (
            <div className="h-5 w-16 rounded skeleton" />
          ) : (
            <p className={`font-semibold text-sm ${value}`}>{totalLeads.toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
