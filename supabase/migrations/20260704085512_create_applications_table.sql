/*
# Create applications table (single-tenant, no auth)

1. New Tables
- `applications`
  - `id` (uuid, primary key)
  - `applicant_name` (text, not null) — name of the applicant
  - `application_number` (text) — optional reference/letter number
  - `subject` (text) — short description of what the application is about
  - `department` (text) — which department/section it belongs to
  - `status` (text, not null, default 'received') — one of 9 workflow stages:
      received, spot, lipik_sign_pending, karadhikari_sign_pending,
      correction_pending, noteshit_lipik_sign_pending,
      noteshit_karadhikari_sign_pending, sent_to_approval, rejected
  - `notes` (text) — free-form remarks / correction details
  - `received_date` (date) — when the application was received
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now()) — last modification timestamp

2. Security
- Enable RLS on `applications`.
- Allow anon + authenticated full CRUD because this is a single-tenant shared app
  with no sign-in screen (intentionally public within the workspace).

3. Notes
- A trigger keeps `updated_at` in sync on every UPDATE.
- An index on `status` speeds up board column queries.
*/

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name text NOT NULL,
  application_number text,
  subject text,
  department text,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received',
      'spot',
      'lipik_sign_pending',
      'karadhikari_sign_pending',
      'correction_pending',
      'noteshit_lipik_sign_pending',
      'noteshit_karadhikari_sign_pending',
      'sent_to_approval',
      'rejected'
    )),
  notes text,
  received_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_applications" ON applications;
CREATE POLICY "anon_select_applications" ON applications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_applications" ON applications;
CREATE POLICY "anon_insert_applications" ON applications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_applications" ON applications;
CREATE POLICY "anon_update_applications" ON applications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_applications" ON applications;
CREATE POLICY "anon_delete_applications" ON applications FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
