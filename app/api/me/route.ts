import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseFromToken } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createServerSupabaseFromToken(token);

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, role, created_at')
    .single();

  if (profileError) {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }

  // Get balance
  const { data: ledger } = await supabase
    .from('credit_ledger')
    .select('delta')
    .eq('user_id', profile.id);

  const balance = (ledger ?? []).reduce((sum, row) => sum + row.delta, 0);

  // Get entitlement count
  const { count } = await supabase
    .from('lead_access')
    .select('lead_id', { count: 'exact', head: true })
    .eq('user_id', profile.id);

  return NextResponse.json({
    profile,
    balance,
    entitlement_count: count ?? 0,
  });
}
