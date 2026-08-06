import pool from '../config/db.js';

// GET /doctor-schedules — no pagination, the whole roster is expected to be small.
async function list(req, res) {
  const { rows } = await pool.query(
    `SELECT ds.id, ds.doctor_id, u.full_name AS doctor_name, ds.day_of_week, ds.start_time, ds.end_time, ds.slot_minutes, ds.is_active
     FROM doctor_schedules ds
     JOIN users u ON u.id = ds.doctor_id
     ORDER BY u.full_name ASC, ds.day_of_week ASC`
  );

  res.json({ data: rows });
}

async function create(req, res) {
  const { doctor_id, day_of_week, start_time, end_time, slot_minutes } = req.body;

  if (!doctor_id || day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'doctor_id, day_of_week, start_time, and end_time are required' },
    });
  }

  const { rows } = await pool.query(
    `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_minutes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [doctor_id, day_of_week, start_time, end_time, slot_minutes || 15]
  );

  res.status(201).json({ data: rows[0] });
}

async function update(req, res) {
  const { id } = req.params;
  const { day_of_week, start_time, end_time, slot_minutes, is_active } = req.body;

  const { rows } = await pool.query(
    `UPDATE doctor_schedules
     SET day_of_week = COALESCE($1, day_of_week),
         start_time = COALESCE($2, start_time),
         end_time = COALESCE($3, end_time),
         slot_minutes = COALESCE($4, slot_minutes),
         is_active = COALESCE($5, is_active)
     WHERE id = $6
     RETURNING *`,
    [day_of_week ?? null, start_time ?? null, end_time ?? null, slot_minutes ?? null, is_active ?? null, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Doctor schedule not found' } });
  }

  res.json({ data: rows[0] });
}

export default { list, create, update };
