import pool from '../config/db.js';

// POST /medical-records — doctor's consultation note (keluhan/diagnosis/catatan).
// doctor_id always comes from the authenticated session, never the request body.
async function create(req, res) {
  const { patient_id, appointment_id, complaint, diagnosis, notes } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'patient_id is required' } });
  }

  const { rows } = await pool.query(
    `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, complaint, diagnosis, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [patient_id, req.user.id, appointment_id || null, complaint || null, diagnosis || null, notes || null]
  );

  res.status(201).json({ data: rows[0] });
}

export default { create };
