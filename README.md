# VerifiedMeasure v3 — DaaS Platform

Enterprise-grade lead data access platform with token-based entitlements, append-only credit ledger, and RLS-enforced security.

---

## Deploy in 8 Steps

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it (e.g. `verifiedmeasure-v3`)
3. Set a strong database password and save it
4. Wait for project to provision (~60 seconds)

---

### Step 2 — Run the Database SQL

1. In your Supabase dashboard → **SQL Editor** → **New query**
2. Copy the entire contents of `supabase/DATABASE_SETUP.sql`
3. Paste into the editor and click **Run**
4. You should see: `Success. No rows returned`

This creates all tables, indexes, RLS policies, RPCs, views, and triggers in one shot.

---

### Step 3 — Configure Supabase Auth

In your Supabase dashboard → **Authentication** → **Providers**:

- Ensure **Email** provider is **enabled**
- **Allow new users to sign up** → ON

Under **Authentication** → **Email Templates** (optional):
- Customize the confirmation email to match your brand

**About email confirmation:**
- If **Confirm email** is ON (default): users must verify their email before signing in. After sign-up, they'll see a confirmation message.
- If **Confirm email** is OFF: users can sign in immediately after sign-up. Easier for testing.

> For testing, you can disable email confirmation: Authentication → Settings → "Enable email confirmations" → OFF

---

### Step 4 — Get Your API Keys

In your Supabase dashboard → **Settings** → **API**:

Copy these two values:
- **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Step 5 — Create GitHub Repository

1. Go to [github.com](https://github.com) → New repository
2. Name it (e.g. `verifiedmeasure-v3`)
3. Set to **Private** (recommended for production)
4. Do NOT initialize with README (you'll push the existing files)

Upload all files from this ZIP:
- Use the **"uploading an existing file"** link on the empty repo page
- Drag and drop all files/folders, preserving the directory structure
- Commit directly to `main`

Critical: ensure these files exist at the root:
- `package.json`
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js`
- `postcss.config.js`

---

### Step 6 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → Add New → Project
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add environment variables (click "Add" for each):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

5. Click **Deploy**
6. Wait ~2 minutes for first build

> **Only these 2 env vars are needed.** No service role key, no secrets.

---

### Step 7 — First Login

1. Visit your deployed Vercel URL
2. Click **Sign Up** and create an account with your email
3. If email confirmation is on, check your inbox and confirm
4. Sign in → you'll land on the dashboard

Your token balance will be **0**. You need to grant yourself credits.

---

### Step 8 — Grant Admin Access & First Credits

**Make yourself admin:**

In Supabase SQL Editor, run:
```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE id = '<your-user-uuid>';
```

To find your UUID: Supabase dashboard → **Authentication** → **Users** → click your email → copy the UUID.

**Grant credits via SQL (fastest for testing):**
```sql
INSERT INTO public.credit_ledger (user_id, delta, reason)
VALUES ('<your-user-uuid>', 500, 'admin_grant');
```

**Or grant credits via API (once you have admin role):**
```bash
curl -X POST https://your-vercel-url.vercel.app/api/admin/grant \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<target-user-uuid>", "delta": 500, "reason": "welcome"}'
```

---

## Architecture

```
Client (browser)
  ↓ supabase.auth (JWT)
  ↓ fetch('/api/unlock', { Authorization: Bearer <token> })

API Routes (server-side, user JWT only)
  ↓ createServerSupabaseFromToken(token)
  ↓ supabase.rpc('unlock_leads_secure', { p_lead_ids })

Supabase (RLS enforced, RPC SECURITY DEFINER)
  ↓ unlock_leads_secure()
    - counts NEW entitlements only
    - checks balance (SUM of credit_ledger.delta)
    - inserts lead_access rows
    - appends credit_ledger debit
    - appends audit_log event
```

**Security model:**
- No service role key in runtime
- All mutations through SECURITY DEFINER RPCs
- RLS blocks direct client mutations to ledger, access, audit
- Admin checks via `is_admin()` with `SET row_security = off`

---

## Replication Guide (New Client Instance)

To deploy a new instance for a different client:

1. Create new Supabase project → run same `DATABASE_SETUP.sql`
2. Create new GitHub repo → push same files
3. Create new Vercel project → set new env vars
4. Customize: update `app/layout.tsx` title, colors in `tailwind.config.js`

Each instance is fully isolated at the Supabase level.

---

## Uploading Leads

Since direct inserts are blocked by RLS for regular users, load leads via:

**Supabase SQL Editor:**
```sql
INSERT INTO public.leads (company, email, phone, industry, location_state, contact_name, title, intelligence_score)
VALUES
  ('Acme Corp', 'ceo@acme.com', '+1-555-000-0001', 'SaaS', 'CA', 'Jane Smith', 'CEO', 85),
  ('Beta LLC', 'ops@beta.co', '+1-555-000-0002', 'FinTech', 'NY', 'John Doe', 'COO', 72);
```

Or use the Supabase **Table Editor** to import a CSV.
