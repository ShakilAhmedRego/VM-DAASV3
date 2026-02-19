'use client';

import type { DashboardMetrics } from '@/types';

interface MetricsBarProps {
  metrics: DashboardMetrics | null;
  darkMode: boolean;
}

export default function MetricsBar({ metrics, darkMode }: MetricsBarProps) {
  const bar = darkMode
    ? 'border-b border-white/5 bg-surface-1/50'
    : 'border-b border-slate-200 bg-white/50';
  const label = darkMode ? 'text-white/40' : 'text-slate-400';
  const value = darkMode ? 'text-white' : 'text-slate-900';
  const divider = darkMode ? 'border-white/8' : 'border-slate-200';

  const stats = [
    { label: 'Total Leads', value: metrics?.total_leads?.toLocaleString() ?? '—' },
    { label: 'Visible Pool', value: metrics?.visible_leads?.toLocaleString() ?? '—' },
    { label: 'Premium', value: metrics?.premium_leads?.toLocaleString() ?? '—' },
    { label: 'Avg Score', value: metrics ? `${Number(metrics.avg_score).toFixed(1)}` : '—' },
  ];

  return (
    <div className={`${bar} flex items-stretch h-12 px-5`}>
      {stats.map((s, i) => (
        <div key={s.label} className={`flex items-center gap-2.5 pr-6 ${i > 0 ? `pl-6 border-l ${divider}` : ''}`}>
          <span className={`text-xs ${label}`}>{s.label}</span>
          <span className={`text-sm font-semibold font-mono ${value}`}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}
