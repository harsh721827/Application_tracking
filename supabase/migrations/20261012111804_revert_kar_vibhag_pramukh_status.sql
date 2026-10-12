/*
# Revert: remove "kar_vibhag_pramukh_sign_pending" from status constraint

1. Modified Tables
- `applications`: the `status` CHECK constraint is restored to its previous set
  of values, removing `kar_vibhag_pramukh_sign_pending`. This status was added
  in the previous migration but is no longer needed — the "कर विभाग प्रमुख सही
  करिता दिले" information will be tracked via notes within the existing
  `noteshit_karadhikari_sign_pending` stage instead.

2. Data Safety
- No rows should have this status since it was just added. Any existing rows
  with this status are moved to `noteshit_karadhikari_sign_pending` before
  the constraint is replaced.

3. Security
- No changes to RLS policies.
*/

UPDATE applications SET status = 'noteshit_karadhikari_sign_pending'
  WHERE status = 'kar_vibhag_pramukh_sign_pending';

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status = ANY (ARRAY[
    'received'::text,
    'spot'::text,
    'lipik_sign_pending'::text,
    'karadhikari_sign_pending'::text,
    'correction_pending'::text,
    'noteshit_lipik_sign_pending'::text,
    'noteshit_karadhikari_sign_pending'::text,
    'sent_to_approval'::text,
    'rejected'::text
  ]));
