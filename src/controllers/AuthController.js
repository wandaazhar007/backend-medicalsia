import admin from '../config/firebase.js';
import pool from '../config/db.js';

// req.user is already resolved by AuthMiddleware at this point — this just
// echoes back the session info the frontend needs (id, name, role). Also the
// one backend touchpoint every login/session-restore passes through, so it
// doubles as where last_login gets stamped for the Users list.
async function verify(req, res) {
  await pool.query('UPDATE users SET last_login = now() WHERE id = $1', [req.user.id]);
  res.json({ data: req.user });
}

// Invites a new staff member: creates their Firebase account, provisions a
// row in `users`, and returns a password-reset link so they can set their
// own password (email delivery is wired up in Fase 6 — for now the link is
// returned directly so the inviter can share it manually).
async function invite(req, res) {
  const { email, full_name, phone, role } = req.body;

  const allowedRoles = ['owner', 'admin', 'doctor', 'receptionist', 'pharmacy', 'cashier'];
  if (!email || !full_name || !role) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email, full_name, and role are required' } });
  }
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `role must be one of: ${allowedRoles.join(', ')}` } });
  }

  try {
    const firebaseUser = await admin.auth().createUser({ email, displayName: full_name });

    const { rows } = await pool.query(
      `INSERT INTO users (firebase_uid, full_name, phone, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, phone, role, is_active, created_at`,
      [firebaseUser.uid, full_name, phone || null, role]
    );

    const resetLink = await admin.auth().generatePasswordResetLink(email);

    res.status(201).json({ data: { user: rows[0], invite_link: resetLink } });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: { code: 'ALREADY_EXISTS', message: 'A Firebase account with this email already exists' } });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to invite staff member' } });
  }
}

export default { verify, invite };
