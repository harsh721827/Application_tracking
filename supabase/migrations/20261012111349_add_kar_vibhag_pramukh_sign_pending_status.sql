/*
# Add "kar_vibhag_pramukh_sign_pending" status to applications

1. Modified Tables
- `applications`: the `status` CHECK constraint is replaced to include the new
  value `'kar_vibhag_pramukh_sign_pending'`. This represents the stage where the
  noteshit has been signed by the Karadhikari and is now given to the कर विभाग
  प्रमुख (Tax Department Head) for signature.

2. Flow Change
- The new stage sits between `noteshit_karadhikari_sign_pending` and
  `sent_to_approval` in the workflow.

3. Security
- No changes to RLS policies.

4. Notes
- The existing constraint `applications_status_check` is dropped and recreated
  with the additional value. No data is lost.
*/

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
    'kar_vibhag_pramukh_sign_pending'::text,
    'sent_to_approval'::text,
    'rejected'::text
  ]));
