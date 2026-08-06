-- Adds users.photo_url for the staff profile page (photo hosted on Cloudinary,
-- this column only stores the resulting secure URL — see 04-architecture-conventions.md
-- pattern for optional-column follow-up migrations, e.g. 003_add_patient_email.sql.

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url text;
