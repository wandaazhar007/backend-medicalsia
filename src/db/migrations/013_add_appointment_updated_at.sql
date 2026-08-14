-- Tracks when an appointment's status last changed, so the cashier's
-- "selesai konsultasi hari ini" list (CashierPage) can be sorted by most
-- recently completed first. Backfilled from created_at for existing rows;
-- AppointmentController.updateStatus sets it explicitly on every transition.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE appointments SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE appointments ALTER COLUMN updated_at SET DEFAULT now();
