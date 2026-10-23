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

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Your session is invalid or has expired. Please sign in again.' } });
  }

  // Kept separate from token verification so a database outage is never
  // reported to the user as a bad login.
  let user;
  try {
    const { rows } = await pool.query(
      'SELECT id, full_name, phone, photo_url, role, is_active FROM users WHERE firebase_uid = $1',
      [decoded.uid]
    );
    user = rows[0];
  } catch (err) {
    console.error('[AuthMiddleware] Database lookup failed:', err.message);
    return res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'We cannot reach the clinic database right now. Please try again in a few minutes, or contact your administrator if the problem persists.',
      },
    });
  }

  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No staff account found for this login. Please contact your clinic administrator.' } });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This staff account has been deactivated. Please contact your clinic administrator.' } });
  }

  req.user = { id: user.id, role: user.role, full_name: user.full_name, phone: user.phone, photo_url: user.photo_url, email: decoded.email || null };
  req.firebaseUid = decoded.uid;
  next();
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
