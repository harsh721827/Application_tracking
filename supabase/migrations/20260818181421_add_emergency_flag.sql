/*
# Add emergency flag and emergency reminder note

## Changes
1. New columns on `applications`:
   - `is_emergency` (boolean, default false) — marks the application as urgent/emergency
   - `emergency_note` (text, nullable) — a short reminder note explaining why it's an emergency

2. No security changes — columns inherit existing RLS policies on the table.
*/

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS is_emergency boolean NOT NULL DEFAULT false;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS emergency_note text;
