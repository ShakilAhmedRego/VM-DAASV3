import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseFromToken } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createServerSupabaseFromToken(token);

  let body: { leadIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const leadIds = body.leadIds;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: 'leadIds must be a non-empty array' }, { status: 400 });
  }

  // Validate UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validIds = leadIds.filter((id): id is string => typeof id === 'string' && uuidRegex.test(id));
  if (validIds.length === 0) {
    return NextResponse.json({ error: 'No valid lead IDs provided' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('unlock_leads_secure', {
    p_lead_ids: validIds,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Insufficient credits')) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
    if (msg.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ error: msg || 'Unlock failed' }, { status: 500 });
  }

  // RPC returns a table row
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    newly_unlocked: result?.newly_unlocked ?? 0,
    token_cost: result?.token_cost ?? 0,
    balance_after: result?.balance_after ?? 0,
  });
}
