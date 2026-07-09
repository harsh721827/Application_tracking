/*
# Add 'approved' to the status CHECK constraint on applications

## Problem
The status column CHECK constraint was added when 'approved' did not exist as a stage.
After 'approved' was introduced in the application code, any attempt to move a card
to 'approved' fails silently because the DB rejects the value.

## Changes
- Drop the old CHECK constraint on applications.status
- Add a new CHECK constraint that includes 'approved'

No data migration needed — no rows have status='approved' yet.
*/

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check CHECK (
    status = ANY (ARRAY[
      'received'::text,
      'spot'::text,
      'lipik_sign_pending'::text,
      'karadhikari_sign_pending'::text,
      'correction_pending'::text,
      'noteshit_lipik_sign_pending'::text,
      'noteshit_karadhikari_sign_pending'::text,
      'sent_to_approval'::text,
      'approved'::text,
      'rejected'::text
    ])
  );
