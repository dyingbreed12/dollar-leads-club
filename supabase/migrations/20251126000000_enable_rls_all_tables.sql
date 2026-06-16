-- Enable Row Level Security on ALL public tables
-- This protects data from unauthorized access via the anon key
-- The service_role key (used by Next.js server) bypasses RLS entirely

-- Enable RLS on all 9 public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_claim_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- Policy: waiting_list - Allow public inserts (for signup form)
-- This is the only table that needs anon access for public signup
CREATE POLICY "Allow public insert to waiting_list"
ON public.waiting_list FOR INSERT
TO anon
WITH CHECK (true);

-- All other tables have no anon policies, meaning:
-- - anon key: BLOCKED (no access)
-- - service_role key: FULL ACCESS (bypasses RLS)
