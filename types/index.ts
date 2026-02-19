export type WorkflowStatus =
  | 'new'
  | 'triaged'
  | 'qualified'
  | 'in_sequence'
  | 'engaged'
  | 'won'
  | 'lost'
  | 'do_not_contact';

export interface Lead {
  id: string;
  company: string;
  website: string | null;
  domain: string | null;
  logo_url: string | null;
  contact_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  location_state: string | null;
  stage: string | null;
  employees: number | null;
  arr_estimate: number | null;
  tech_stack: string[] | null;
  intelligence_score: number;
  workflow: WorkflowStatus;
  is_premium: boolean;
  is_archived: boolean;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LeadAccess {
  lead_id: string;
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface UserProfile {
  id: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface DashboardMetrics {
  total_leads: number;
  visible_leads: number;
  premium_leads: number;
  avg_score: number;
}

export interface StageBreakdown {
  stage: string;
  company_count: number;
}

export interface UnlockResult {
  newly_unlocked: number;
  token_cost: number;
  balance_after: number;
}
