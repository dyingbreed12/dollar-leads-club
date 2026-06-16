-- Allow browser (anon key) to read auto-claim settings for timezone display
-- This is needed by the use-timezone.ts hook running in client components
CREATE POLICY "Allow public read of auto-claim settings"
ON public.settings FOR SELECT
TO anon
USING (type = 'auto-claim');
