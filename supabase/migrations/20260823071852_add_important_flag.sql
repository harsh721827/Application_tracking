/*
# Add important flag and important note

## Changes
1. New columns on `applications`:
   - `is_important` (boolean, default false) — marks the application as important / needs to be done
   - `important_note` (text, nullable) — a note describing why it's important

2. No security changes — columns inherit existing RLS policies on the table.
*/

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS important_note text;
