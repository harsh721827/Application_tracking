/*
# Add audit trail for application status changes

## Changes
1. New Table: `status_history`
   - `id` (uuid, primary key)
   - `application_id` (uuid, foreign key to applications.id, ON DELETE CASCADE)
   - `from_status` (text, nullable — null for initial creation)
   - `to_status` (text, the new status)
   - `remark` (text, nullable — optional note about the transition)
   - `created_at` (timestamptz, defaults to now())

2. Trigger: `log_status_change`
   - AFTER INSERT OR UPDATE trigger on `applications`
   - On INSERT: logs a history entry with from_status = NULL, to_status = NEW.status
   - On UPDATE: logs a history entry only when status actually changed
   - Uses a PL/pgSQL function `log_status_change_fn()` that is idempotent (CREATE OR REPLACE)

3. Security
   - RLS enabled on `status_history`
   - Single-tenant (no auth) — same anon+authenticated CRUD pattern as applications and application_files

## Important Notes
1. The trigger automatically records every status transition — no app-side code needed
2. On INSERT, it logs the initial status (from_status = NULL)
3. On UPDATE, it only logs when status actually changes (skips no-op updates)
4. Deleting an application cascades to delete its history (ON DELETE CASCADE)
*/

-- 1. Create status_history table
CREATE TABLE IF NOT EXISTS status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  remark text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- 3. CRUD policies (single-tenant, no auth)
DROP POLICY IF EXISTS "select_status_history" ON status_history;
CREATE POLICY "select_status_history"
ON status_history FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_status_history" ON status_history;
CREATE POLICY "insert_status_history"
ON status_history FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_status_history" ON status_history;
CREATE POLICY "update_status_history"
ON status_history FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_status_history" ON status_history;
CREATE POLICY "delete_status_history"
ON status_history FOR DELETE
TO anon, authenticated USING (true);

-- 4. Index for querying history by application
CREATE INDEX IF NOT EXISTS idx_status_history_app_id
ON status_history(application_id, created_at);

-- 5. Trigger function to log status changes
CREATE OR REPLACE FUNCTION log_status_change_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: log initial status
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO status_history (application_id, from_status, to_status)
    VALUES (NEW.id, NULL, NEW.status);
    RETURN NEW;
  END IF;

  -- On UPDATE: only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO status_history (application_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger (idempotent)
DROP TRIGGER IF EXISTS log_status_change ON applications;
CREATE TRIGGER log_status_change
AFTER INSERT OR UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION log_status_change_fn();

-- 7. Backfill: create initial history entries for existing applications
-- that don't have any history yet (from before the trigger existed)
INSERT INTO status_history (application_id, from_status, to_status, created_at)
SELECT a.id, NULL, a.status, a.created_at
FROM applications a
WHERE NOT EXISTS (
  SELECT 1 FROM status_history h WHERE h.application_id = a.id
);
