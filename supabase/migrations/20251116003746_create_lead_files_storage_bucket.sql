-- Create the storage bucket for lead CSV files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-files',
  'lead-files',
  true,  -- Public bucket (accessible via public URL)
  52428800,  -- 50MB in bytes
  ARRAY['text/csv', 'application/csv', 'text/plain']::text[]
);

-- RLS Policy: Allow authenticated admins to upload lead files
CREATE POLICY "Admins can upload lead files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-files'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- RLS Policy: Allow authenticated admins to read lead files
CREATE POLICY "Admins can read lead files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-files'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- RLS Policy: Allow admins to delete lead files
CREATE POLICY "Admins can delete lead files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-files'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- RLS Policy: Allow public read access (since bucket is public)
CREATE POLICY "Public can read lead files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lead-files');
