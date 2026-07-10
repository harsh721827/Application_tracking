/*
# Remove 'approved' stage from applications

## Changes
- Move any rows with status='approved' back to 'sent_to_approval' (no data loss)
- Drop and recreate the CHECK constraint without 'approved'
*/

UPDATE applications SET status = 'sent_to_approval' WHERE status = 'approved';

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

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
      'rejected'::text
    ])
  );
