import type { Lead } from '@/types';

/**
 * Returns the set of entitled lead IDs for the current user.
 */
export function buildEntitlementSet(leadAccess: { lead_id: string }[]): Set<string> {
  return new Set(leadAccess.map((la) => la.lead_id));
}

/**
 * Masks email/phone for leads the user is not entitled to.
 */
export function maskLead(lead: Lead, entitlementSet: Set<string>): Lead {
  if (entitlementSet.has(lead.id)) return lead;
  return {
    ...lead,
    email: lead.email ? maskEmail(lead.email) : null,
    phone: lead.phone ? maskPhone(lead.phone) : null,
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '•••@•••.•••';
  const visible = local.length > 2 ? local.slice(0, 2) : local[0] ?? '•';
  return `${visible}${'•'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, '•');
}

/**
 * Computes the number of leads in selection that are NOT yet entitled (i.e. new claims).
 */
export function computeNewClaimCount(
  selectedIds: string[],
  entitlementSet: Set<string>
): number {
  return selectedIds.filter((id) => !entitlementSet.has(id)).length;
}
