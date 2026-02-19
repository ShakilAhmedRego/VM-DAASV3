'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';
import type { Lead, CreditLedgerEntry, DashboardMetrics, StageBreakdown } from '@/types';
import { buildEntitlementSet, maskLead, computeNewClaimCount } from '@/lib/entitlements';
import { generateCSV, downloadCSV } from '@/lib/csv';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import BalanceCard from '@/components/BalanceCard';
import TransactionsPanel from '@/components/TransactionsPanel';
import LeadBrowser from '@/components/LeadBrowser';
import Toast from '@/components/Toast';
import MetricsBar from '@/components/MetricsBar';

export type ToastType = { id: number; message: string; variant: 'success' | 'error' | 'info' };

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Data states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [entitlementSet, setEntitlementSet] = useState<Set<string>>(new Set());
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stageBreakdown, setStageBreakdown] = useState<StageBreakdown[]>([]);

  // UI states
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unlocking, setUnlocking] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [activePanel, setActivePanel] = useState<'browser' | 'transactions' | 'analytics'>('browser');

  const addToast = useCallback((message: string, variant: ToastType['variant'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('vm-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('vm-dark');
    if (saved === '0') setDarkMode(false);
  }, []);

  // Auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/');
        return;
      }
      setUserId(data.session.user.id);
      setAccessToken(data.session.access_token);
      setUserEmail(data.session.user.email ?? '');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) router.replace('/');
      else {
        setUserId(session.user.id);
        setAccessToken(session.access_token);
        setUserEmail(session.user.email ?? '');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  // Load data when authenticated
  const loadLeads = useCallback(async () => {
    if (!userId) return;
    setLoadingLeads(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250);
    if (error) {
      addToast('Failed to load leads', 'error');
    } else {
      setLeads(data ?? []);
    }
    setLoadingLeads(false);
  }, [userId, supabase, addToast]);

  const loadEntitlements = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('lead_access')
      .select('lead_id')
      .eq('user_id', userId);
    if (!error && data) {
      setEntitlementSet(buildEntitlementSet(data));
    }
  }, [userId, supabase]);

  const loadLedger = useCallback(async () => {
    if (!userId) return;
    setLoadingLedger(true);
    const { data, error } = await supabase
      .from('credit_ledger')
      .select('delta, reason, meta, created_at, id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      setLedger(data);
      const bal = data.reduce((sum, row) => sum + row.delta, 0);
      setBalance(bal);
    }
    setLoadingLedger(false);
  }, [userId, supabase]);

  const loadMetrics = useCallback(async () => {
    const { data } = await supabase.from('dashboard_metrics').select('*').single();
    if (data) setMetrics(data);
    const { data: sb } = await supabase
      .from('stage_breakdown')
      .select('*')
      .order('company_count', { ascending: false });
    if (sb) setStageBreakdown(sb);
  }, [supabase]);

  const checkAdmin = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data?.role === 'admin') setIsAdmin(true);
  }, [userId, supabase]);

  useEffect(() => {
    if (!userId) return;
    loadLeads();
    loadEntitlements();
    loadLedger();
    loadMetrics();
    checkAdmin();
  }, [userId, loadLeads, loadEntitlements, loadLedger, loadMetrics, checkAdmin]);

  // Unlock handler
  const handleUnlock = useCallback(async () => {
    if (!accessToken || selectedIds.size === 0) return;
    const newCount = computeNewClaimCount(Array.from(selectedIds), entitlementSet);
    if (newCount === 0) {
      addToast('All selected leads are already unlocked — re-download is free.', 'info');
      return;
    }
    if (balance < newCount) {
      addToast(`Insufficient tokens. Need ${newCount}, have ${balance}.`, 'error');
      return;
    }
    setUnlocking(true);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unlock failed');
      addToast(`Unlocked ${json.newly_unlocked} leads. Balance: ${json.balance_after} tokens.`, 'success');
      await Promise.all([loadEntitlements(), loadLedger()]);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Unlock failed', 'error');
    } finally {
      setUnlocking(false);
    }
  }, [accessToken, selectedIds, entitlementSet, balance, addToast, loadEntitlements, loadLedger]);

  // CSV download
  const handleDownloadCSV = useCallback(() => {
    const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
    if (selectedLeads.length === 0) return;
    const csv = generateCSV(selectedLeads, entitlementSet);
    downloadCSV(csv, `vm-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    addToast(`Exported ${selectedLeads.length} leads to CSV.`, 'success');
  }, [leads, selectedIds, entitlementSet, addToast]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/');
  }, [supabase, router]);

  const maskedLeads = leads.map((l) => maskLead(l, entitlementSet));
  const newClaimCount = computeNewClaimCount(Array.from(selectedIds), entitlementSet);

  if (!userId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-surface' : 'bg-slate-50'}`}>
      <TopNav
        userEmail={userEmail}
        isAdmin={isAdmin}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onSignOut={handleSignOut}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePanel={activePanel} onSelect={setActivePanel} />

        <main className="flex-1 overflow-auto">
          {/* Metrics bar */}
          <MetricsBar metrics={metrics} darkMode={darkMode} />

          <div className="flex flex-col xl:flex-row gap-5 p-5 pt-4 min-h-0">
            {/* Left column */}
            <div className="flex flex-col gap-5 xl:w-72 shrink-0">
              <BalanceCard
                balance={balance}
                loading={loadingLedger}
                entitledCount={entitlementSet.size}
                totalLeads={leads.length}
                darkMode={darkMode}
              />
              <TransactionsPanel
                ledger={ledger}
                loading={loadingLedger}
                darkMode={darkMode}
              />
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <LeadBrowser
                leads={maskedLeads}
                entitlementSet={entitlementSet}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                newClaimCount={newClaimCount}
                balance={balance}
                loading={loadingLeads}
                unlocking={unlocking}
                onUnlock={handleUnlock}
                onDownloadCSV={handleDownloadCSV}
                darkMode={darkMode}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} variant={t.variant} />
        ))}
      </div>
    </div>
  );
}
