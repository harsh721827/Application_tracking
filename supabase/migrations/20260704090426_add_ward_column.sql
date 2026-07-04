/*
# Add ward column to applications

1. Modified Tables
- `applications`
  - Add `ward` (text) — ward identifier such as BMC1..BMC15. Nullable for
    backwards compatibility with existing rows.

2. Security
- No policy changes; existing anon/authenticated CRUD policies already cover
  the new column (full-row access, no column-level restrictions).

3. Notes
- Non-destructive: only adds a column, does not drop or rename anything.
- An index on `ward` speeds up the ward filter dropdown.
*/

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ward text;

CREATE INDEX IF NOT EXISTS idx_applications_ward ON applications (ward);
