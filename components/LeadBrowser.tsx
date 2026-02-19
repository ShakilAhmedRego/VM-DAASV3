'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Lead } from '@/types';

interface LeadBrowserProps {
  leads: Lead[];
  entitlementSet: Set<string>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  newClaimCount: number;
  balance: number;
  loading: boolean;
  unlocking: boolean;
  onUnlock: () => void;
  onDownloadCSV: () => void;
  darkMode: boolean;
}

const INDUSTRY_OPTIONS = ['All Industries', 'SaaS', 'FinTech', 'Healthcare', 'Consumer', 'Enterprise', 'E-commerce', 'Other'];
const STATE_OPTIONS = ['All States', 'CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'MA', 'CO', 'GA', 'AZ'];
const SIZE_OPTIONS = ['All Sizes', '1-10', '11-50', '51-200', '201-500', '500+'];

function employeeRange(size: string): [number, number] {
  const map: Record<string, [number, number]> = {
    '1-10': [1, 10],
    '11-50': [11, 50],
    '51-200': [51, 200],
    '201-500': [201, 500],
    '500+': [500, Infinity],
  };
  return map[size] ?? [0, Infinity];
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-500/15 text-green-400 border-green-500/20' :
    score >= 50 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' :
    'bg-slate-500/15 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-mono ${color}`}>
      {score}
    </span>
  );
}

function StatusBadge({ entitled, isPremium }: { entitled: boolean; isPremium: boolean }) {
  if (entitled) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-500/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
          <path d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
        Unlocked
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
      isPremium
        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        : 'bg-white/5 text-white/40 border border-white/10'
    }`}>
      {isPremium ? '★ Premium' : 'Preview'}
    </span>
  );
}

export default function LeadBrowser({
  leads,
  entitlementSet,
  selectedIds,
  onSelectionChange,
  newClaimCount,
  balance,
  loading,
  unlocking,
  onUnlock,
  onDownloadCSV,
  darkMode,
}: LeadBrowserProps) {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All Industries');
  const [state, setState] = useState('All States');
  const [size, setSize] = useState('All Sizes');
  const [sortBy, setSortBy] = useState<'newest' | 'score'>('newest');

  const filtered = useMemo(() => {
    let result = leads;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          (l.contact_name ?? '').toLowerCase().includes(q) ||
          (l.email ?? '').toLowerCase().includes(q) ||
          (l.domain ?? '').toLowerCase().includes(q)
      );
    }

    if (industry !== 'All Industries') {
      result = result.filter((l) => l.industry === industry);
    }

    if (state !== 'All States') {
      result = result.filter((l) => l.location_state === state);
    }

    if (size !== 'All Sizes') {
      const [min, max] = employeeRange(size);
      result = result.filter((l) => l.employees != null && l.employees >= min && l.employees <= max);
    }

    if (sortBy === 'score') {
      result = [...result].sort((a, b) => b.intelligence_score - a.intelligence_score);
    }

    return result;
  }, [leads, search, industry, state, size, sortBy]);

  const toggleSelect = useCallback((id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  const selectAll = useCallback(() => {
    onSelectionChange(new Set(filtered.map((l) => l.id)));
  }, [filtered, onSelectionChange]);

  const clearAll = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  const toggleAll = useCallback(() => {
    const allSelected = filtered.every((l) => selectedIds.has(l.id));
    if (allSelected) clearAll();
    else selectAll();
  }, [filtered, selectedIds, clearAll, selectAll]);

  const card = darkMode
    ? 'bg-surface-2 border border-white/6 rounded-2xl overflow-hidden'
    : 'bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm';
  const label = darkMode ? 'text-white/40' : 'text-slate-400';
  const text = darkMode ? 'text-white' : 'text-slate-900';
  const inputCls = darkMode
    ? 'bg-surface-3 border border-white/10 text-white placeholder-white/25 focus:border-brand-500 focus:ring-brand-500'
    : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500';
  const selectCls = `${inputCls} text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 transition-colors cursor-pointer`;
  const divider = darkMode ? 'border-white/5' : 'border-slate-100';

  const canUnlock = newClaimCount > 0 && balance >= newClaimCount;

  return (
    <div className={card}>
      {/* Header */}
      <div className={`px-5 py-4 border-b ${divider}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`font-display text-xl ${text}`}>Lead Browser</h2>
            <p className={`text-xs mt-0.5 ${label}`}>
              Filter the preview pool · Token deductions apply only for new claims
            </p>
          </div>
          <div className={`text-xs font-mono ${label}`}>
            Showing <span className={`font-semibold ${text}`}>{filtered.length}</span> leads
          </div>
        </div>

        {/* Filters row 1 */}
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="relative flex-1 min-w-48">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${label}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact, email…"
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 transition-colors ${inputCls}`}
            />
          </div>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectCls}>
            {INDUSTRY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          <select value={state} onChange={(e) => setState(e.target.value)} className={selectCls}>
            {STATE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          <select value={size} onChange={(e) => setSize(e.target.value)} className={selectCls}>
            {SIZE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Filters row 2 */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'score')}
            className={selectCls}
          >
            <option value="newest">Newest first</option>
            <option value="score">Highest score</option>
          </select>
          <button
            onClick={toggleAll}
            className={`text-sm px-3 py-2 rounded-xl border transition-colors ${
              darkMode
                ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {filtered.every((l) => selectedIds.has(l.id)) && filtered.length > 0
              ? 'Deselect all'
              : `Select all (${filtered.length})`}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={clearAll}
              className={`text-sm px-3 py-2 rounded-xl border transition-colors ${
                darkMode
                  ? 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                  : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Action bar */}
      {(selectedIds.size > 0 || newClaimCount > 0) && (
        <div className={`px-5 py-3 flex items-center gap-4 flex-wrap border-b ${divider} ${
          darkMode ? 'bg-brand-950/30' : 'bg-brand-50'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${text}`}>
              Selected: <span className="font-mono">{selectedIds.size}</span>
            </span>
            <span className={`text-sm ${label}`}>
              Token cost: <span className={`font-mono font-semibold ${newClaimCount > 0 ? 'text-brand-400' : text}`}>
                {newClaimCount} new claims
              </span>
            </span>
            {balance < newClaimCount && newClaimCount > 0 && (
              <span className="text-xs text-red-400">Insufficient tokens</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onUnlock}
              disabled={unlocking || newClaimCount === 0 || !canUnlock}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
            >
              {unlocking && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {newClaimCount === 0 ? 'Already unlocked' : `Unlock ${newClaimCount} leads`}
            </button>
            <button
              onClick={onDownloadCSV}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                darkMode
                  ? 'border-white/10 text-white/70 hover:text-white hover:bg-white/5'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${divider}`}>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id))}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              {['Company', 'Contact', 'Industry', 'Location', 'Score', 'Status'].map((h) => (
                <th key={h} className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${label}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className={`border-b ${divider}`}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-3 py-3.5">
                      <div className={`h-4 rounded ${darkMode ? 'skeleton' : 'skeleton-light'}`} style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-surface-3' : 'bg-slate-100'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-6 h-6 ${label}`}>
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className={`text-sm font-medium ${text}`}>No leads match your filters</p>
                    <p className={`text-xs ${label}`}>Try broadening your search criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const entitled = entitlementSet.has(lead.id);
                const selected = selectedIds.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => toggleSelect(lead.id)}
                    className={`border-b ${divider} cursor-pointer transition-colors duration-100 ${
                      selected
                        ? darkMode ? 'bg-brand-950/40' : 'bg-brand-50'
                        : darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                          darkMode ? 'bg-surface-3 text-white/60' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {lead.company[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium truncate max-w-[180px] ${text}`}>{lead.company}</p>
                          {lead.domain && (
                            <p className={`text-xs truncate max-w-[180px] ${label}`}>{lead.domain}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className={`font-medium ${text}`}>{lead.contact_name ?? '—'}</p>
                      {lead.title && <p className={`text-xs ${label}`}>{lead.title}</p>}
                      <p className={`text-xs font-mono mt-0.5 ${entitled ? 'text-brand-400' : label}`}>
                        {lead.email ?? '—'}
                      </p>
                    </td>
                    <td className={`px-3 py-3 ${label}`}>{lead.industry ?? '—'}</td>
                    <td className={`px-3 py-3 ${label}`}>{lead.location_state ?? '—'}</td>
                    <td className="px-3 py-3">
                      <ScoreBadge score={lead.intelligence_score} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge entitled={entitled} isPremium={lead.is_premium} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
