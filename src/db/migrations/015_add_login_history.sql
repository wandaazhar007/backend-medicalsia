-- Tracks each successful sign-in for the "Riwayat Login" card on the Profile
-- page. Written by AuthController.verify — the same single touchpoint that
-- already stamps users.last_login, so a page refresh also counts as an entry
-- here, consistent with how last_login already treats session-restore.
CREATE TABLE IF NOT EXISTS login_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id),
  logged_in_at  timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id_logged_in_at
  ON login_history (user_id, logged_in_at DESC);
