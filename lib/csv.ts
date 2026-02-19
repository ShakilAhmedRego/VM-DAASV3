import type { Lead } from '@/types';
import { maskLead } from '@/lib/entitlements';

const HEADERS = [
  'Company',
  'Domain',
  'Contact Name',
  'Title',
  'Email',
  'Phone',
  'Industry',
  'State',
  'Stage',
  'Employees',
  'ARR Estimate',
  'Intelligence Score',
  'Workflow',
  'Is Premium',
  'Created At',
];

function escape(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(leads: Lead[], entitlementSet: Set<string>): string {
  const rows = [HEADERS.join(',')];
  for (const raw of leads) {
    const lead = maskLead(raw, entitlementSet);
    rows.push(
      [
        lead.company,
        lead.domain,
        lead.contact_name,
        lead.title,
        lead.email,
        lead.phone,
        lead.industry,
        lead.location_state,
        lead.stage,
        lead.employees,
        lead.arr_estimate,
        lead.intelligence_score,
        lead.workflow,
        lead.is_premium,
        lead.created_at,
      ]
        .map(escape)
        .join(',')
    );
  }
  return rows.join('\n');
}

export function downloadCSV(content: string, filename = 'leads-export.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
