/*
# Add file upload support to applications

## Changes
1. New Table: `application_files`
   - `id` (uuid, primary key)
   - `application_id` (uuid, foreign key to applications.id, ON DELETE CASCADE)
   - `file_name` (text, original file name as uploaded)
   - `file_path` (text, path in Supabase Storage bucket)
   - `file_size` (bigint, size in bytes)
   - `file_type` (text, MIME type)
   - `created_at` (timestamptz, defaults to now())

2. Storage
   - Creates a public storage bucket `application-files` (50 MB file size limit)
   - Storage policies allow anon+authenticated to read, upload, and delete files

3. Security
   - RLS enabled on `application_files`
   - Since the app has no sign-in (single-tenant), all CRUD is open to anon+authenticated
   - This matches the existing applications table pattern
*/

-- 1. Create application_files table
CREATE TABLE IF NOT EXISTS application_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE application_files ENABLE ROW LEVEL SECURITY;

-- 3. CRUD policies (single-tenant, no auth — same pattern as applications)
DROP POLICY IF EXISTS "select_application_files" ON application_files;
CREATE POLICY "select_application_files"
ON application_files FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_application_files" ON application_files;
CREATE POLICY "insert_application_files"
ON application_files FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_application_files" ON application_files;
CREATE POLICY "update_application_files"
ON application_files FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_application_files" ON application_files;
CREATE POLICY "delete_application_files"
ON application_files FOR DELETE
TO anon, authenticated USING (true);

-- 4. Create storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('application-files', 'application-files', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies (public bucket, allow CRUD)
DROP POLICY IF EXISTS "read_application_files_bucket" ON storage.objects;
CREATE POLICY "read_application_files_bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'application-files');

DROP POLICY IF EXISTS "insert_application_files_bucket" ON storage.objects;
CREATE POLICY "insert_application_files_bucket"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'application-files');

DROP POLICY IF EXISTS "update_application_files_bucket" ON storage.objects;
CREATE POLICY "update_application_files_bucket"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'application-files')
WITH CHECK (bucket_id = 'application-files');

DROP POLICY IF EXISTS "delete_application_files_bucket" ON storage.objects;
CREATE POLICY "delete_application_files_bucket"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'application-files');

-- 6. Index for querying files by application
CREATE INDEX IF NOT EXISTS idx_application_files_app_id
ON application_files(application_id);
