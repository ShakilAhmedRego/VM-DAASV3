import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseFromToken } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createServerSupabaseFromToken(token);

  let body: { userId?: unknown; delta?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userId, delta, reason } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (!delta || typeof delta !== 'number' || delta === 0) {
    return NextResponse.json({ error: 'delta must be a non-zero number' }, { status: 400 });
  }

  const { error } = await supabase.rpc('admin_grant_credits', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: typeof reason === 'string' ? reason : 'admin_grant',
    p_meta: {},
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Not authorized')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (msg.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ error: msg || 'Grant failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
