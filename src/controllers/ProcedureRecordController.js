import pool from '../config/db.js';

// GET /procedure-records?patient_id=&status= — used by the cashier to find a
// patient's not-yet-billed procedures before building an invoice. No
// pagination: a patient realistically has at most one 'pending' procedure
// record open at a time, same reasoning as PrescriptionController.list.
async function list(req, res) {
  const { patient_id, status } = req.query;

  const conditions = [];
  const params = [];

  if (patient_id) {
    params.push(patient_id);
    conditions.push(`mr.patient_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`pr.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: records } = await pool.query(
    `SELECT pr.id, pr.medical_record_id, pr.doctor_id, pr.status, pr.created_at, mr.patient_id
     FROM procedure_records pr
     JOIN medical_records mr ON mr.id = pr.medical_record_id
     ${whereClause}
     ORDER BY pr.created_at DESC`,
    params
  );

  for (const record of records) {
    const { rows: items } = await pool.query(
      `SELECT pri.id, pri.quantity, pri.notes, pri.status,
              mp.id AS medical_procedure_id, mp.name AS procedure_name, mp.price
       FROM procedure_record_items pri
       JOIN medical_procedures mp ON mp.id = pri.medical_procedure_id
       WHERE pri.procedure_record_id = $1
       ORDER BY pri.created_at ASC`,
      [record.id]
    );
    record.items = items;
  }

  res.json({ data: records });
}

// POST /procedure-records — doctor records procedures performed during a
// consultation (e.g. suntik, nebulizer, jahit luka).
async function create(req, res) {
  const { medical_record_id, items } = req.body;

  if (!medical_record_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'medical_record_id and at least one item are required' },
    });
  }

  const { rows: recordRows } = await pool.query(
    `INSERT INTO procedure_records (medical_record_id, doctor_id)
     VALUES ($1, $2)
     RETURNING *`,
    [medical_record_id, req.user.id]
  );
  const record = recordRows[0];

  const insertedItems = [];
  for (const item of items) {
    const { rows } = await pool.query(
      `INSERT INTO procedure_record_items (procedure_record_id, medical_procedure_id, quantity, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [record.id, item.medical_procedure_id, item.quantity || 1, item.notes || null]
    );
    insertedItems.push(rows[0]);
  }

  res.status(201).json({ data: { ...record, items: insertedItems } });
}

// GET /procedure-records/:id
async function getById(req, res) {
  const { id } = req.params;

  const { rows: recordRows } = await pool.query('SELECT * FROM procedure_records WHERE id = $1', [id]);
  const record = recordRows[0];

  if (!record) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Procedure record not found' } });
  }

  const { rows: items } = await pool.query(
    `SELECT pri.id, pri.quantity, pri.notes, pri.status,
            mp.id AS medical_procedure_id, mp.name AS procedure_name, mp.price
     FROM procedure_record_items pri
     JOIN medical_procedures mp ON mp.id = pri.medical_procedure_id
     WHERE pri.procedure_record_id = $1
     ORDER BY pri.created_at ASC`,
    [id]
  );

  res.json({ data: { ...record, items } });
}

export default { list, create, getById };
