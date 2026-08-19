import admin from '../config/firebase.js';
import pool from '../config/db.js';

// Verifies the Firebase ID token, then resolves the corresponding row in `users`
// by firebase_uid and attaches it to req.user. No clinic_id resolution needed —
// one deployment always serves exactly one clinic.
export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing Authorization bearer token' } });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    const { rows } = await pool.query(
      'SELECT id, full_name, phone, photo_url, role, is_active FROM users WHERE firebase_uid = $1',
      [decoded.uid]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No staff account found for this login' } });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This staff account has been deactivated' } });
    }

    req.user = { id: user.id, role: user.role, full_name: user.full_name, phone: user.phone, photo_url: user.photo_url, email: decoded.email || null };
    req.firebaseUid = decoded.uid;
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired Firebase token' } });
  }
}

// Route guard for endpoints restricted to specific staff roles (e.g. owner/admin).
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role for this action' } });
    }
    next();
  };
}
