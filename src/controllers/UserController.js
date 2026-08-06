import pool from '../config/db.js';
import cloudinary from '../config/cloudinary.js';

const ALLOWED_ROLES = ['owner', 'admin', 'doctor', 'receptionist', 'pharmacy', 'cashier'];

// GET /users?page=&limit=&search= — search matches staff name (email lives in
// Firebase, not in this table, so search is scoped to full_name for now).
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const search = req.query.search ? `%${req.query.search}%` : null;
  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE full_name ILIKE $1' : '';
  const params = search ? [search] : [];

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
    params
  );
  const totalItems = countRows[0].total;

  const { rows } = await pool.query(
    `SELECT id, firebase_uid, full_name, phone, role, is_active, created_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    data: rows,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
    },
  });
}

// GET /users/:id — single staff member, used by the edit form.
async function getById(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    'SELECT id, firebase_uid, full_name, phone, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }

  res.json({ data: rows[0] });
}

// PATCH /users/:id — owner/admin update a staff member's profile, role, or
// active state. Deactivating (is_active: false) is this app's only "delete"
// for staff — a hard DELETE would orphan every medical_records/prescriptions/
// invoices/appointments/queue_calls row that references them as doctor,
// cashier, or creator, breaking the medical/audit record permanently.
async function update(req, res) {
  const { id } = req.params;
  const { full_name, phone, role, is_active } = req.body;

  if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `role must be one of: ${ALLOWED_ROLES.join(', ')}` } });
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         role = COALESCE($3, role),
         is_active = COALESCE($4, is_active)
     WHERE id = $5
     RETURNING id, firebase_uid, full_name, phone, role, is_active, created_at`,
    [full_name ?? null, phone ?? null, role ?? null, is_active ?? null, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }

  res.json({ data: rows[0] });
}

// GET /users/me — self-service profile read, any authenticated role.
async function getMe(req, res) {
  const { rows } = await pool.query(
    'SELECT id, full_name, phone, photo_url, role, is_active, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  res.json({ data: rows[0] });
}

// PATCH /users/me — self-service profile update. Deliberately narrower than
// PATCH /users/:id — role/is_active are staff-management concerns owned by
// owner/admin, never self-editable.
async function updateMe(req, res) {
  const { full_name, phone } = req.body;

  const { rows } = await pool.query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone)
     WHERE id = $3
     RETURNING id, full_name, phone, photo_url, role, is_active, created_at`,
    [full_name ?? null, phone ?? null, req.user.id]
  );

  res.json({ data: rows[0] });
}

// POST /users/me/photo — multipart upload (see UserRoutes.js for the multer
// middleware), stores the file on Cloudinary and saves only the resulting URL.
async function uploadMyPhoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A photo file is required' } });
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'medicalsia/staff-photos', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(req.file.buffer);
  });

  const { rows } = await pool.query(
    'UPDATE users SET photo_url = $1 WHERE id = $2 RETURNING photo_url',
    [uploadResult.secure_url, req.user.id]
  );

  res.json({ data: rows[0] });
}

export default { list, getById, update, getMe, updateMe, uploadMyPhoto };
