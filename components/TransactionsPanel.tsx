'use client';

import type { CreditLedgerEntry } from '@/types';

interface TransactionsPanelProps {
  ledger: CreditLedgerEntry[];
  loading: boolean;
  darkMode: boolean;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    admin_grant: 'Admin Grant',
    unlock: 'Lead Unlock',
    unknown: 'Credit',
  };
  return map[reason] ?? reason;
}

export default function TransactionsPanel({ ledger, loading, darkMode }: TransactionsPanelProps) {
  const card = darkMode
    ? 'bg-surface-2 border border-white/6 rounded-2xl p-5'
    : 'bg-white border border-slate-200 rounded-2xl p-5 shadow-sm';
  const label = darkMode ? 'text-white/40' : 'text-slate-400';
  const text = darkMode ? 'text-white/80' : 'text-slate-700';
  const divider = darkMode ? 'border-white/5' : 'border-slate-100';

  return (
    <div className={`${card} flex flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <p className={`text-xs uppercase tracking-wider font-medium ${label}`}>Transactions</p>
        <span className={`text-xs ${label}`}>{ledger.length} entries</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl skeleton" />
          ))}
        </div>
      ) : ledger.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${darkMode ? 'bg-surface-3' : 'bg-slate-100'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-5 h-5 ${label}`}>
              <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className={`text-sm ${label}`}>No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-0 overflow-y-auto max-h-64 -mx-5 px-5">
          {ledger.map((entry, i) => (
            <div
              key={entry.id ?? i}
              className={`flex items-center justify-between py-2.5 ${i < ledger.length - 1 ? `border-b ${divider}` : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${text}`}>{reasonLabel(entry.reason)}</p>
                <p className={`text-xs ${label}`}>{formatDate(entry.created_at)}</p>
              </div>
              <span className={`text-sm font-mono font-semibold ml-3 shrink-0 ${
                entry.delta > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {entry.delta > 0 ? '+' : ''}{entry.delta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
