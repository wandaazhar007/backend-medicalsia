-- Tracks the last time a staff member successfully authenticated, shown in
-- the Users list. Written by AuthController.verify (the one backend
-- touchpoint every login/session-restore passes through).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;
