import pool from '../config/db.js';

// GET /prescriptions?patient_id=&status= — used by the cashier to find a
// patient's not-yet-billed prescription before building an invoice. No
// pagination: a patient realistically has at most one 'pending' prescription
// open at a time.
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
    conditions.push(`p.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: prescriptions } = await pool.query(
    `SELECT p.id, p.medical_record_id, p.doctor_id, p.status, p.created_at, mr.patient_id
     FROM prescriptions p
     JOIN medical_records mr ON mr.id = p.medical_record_id
     ${whereClause}
     ORDER BY p.created_at DESC`,
    params
  );

  for (const prescription of prescriptions) {
    const { rows: items } = await pool.query(
      `SELECT pi.id, pi.dosage, pi.quantity, pi.instructions, pi.status,
              m.id AS medicine_id, m.name AS medicine_name, m.price, m.stock_qty,
              (m.stock_qty <= 0) AS is_out_of_stock
       FROM prescription_items pi
       JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = $1
       ORDER BY pi.created_at ASC`,
      [prescription.id]
    );
    prescription.items = items;
  }

  res.json({ data: prescriptions });
}

// POST /prescriptions — doctor prescribes medicines for a consultation.
// Medicines with stock_qty <= 0 are still selectable here on purpose (see
// 05-business-flow.md "Kenapa Stok Tidak Diblokir Saat Peresepan") — the
// cashier decides what to exclude later, not the doctor's UI.
async function create(req, res) {
  const { medical_record_id, items } = req.body;

  if (!medical_record_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'medical_record_id and at least one item are required' },
    });
  }

  const { rows: prescriptionRows } = await pool.query(
    `INSERT INTO prescriptions (medical_record_id, doctor_id)
     VALUES ($1, $2)
     RETURNING *`,
    [medical_record_id, req.user.id]
  );
  const prescription = prescriptionRows[0];

  const insertedItems = [];
  for (const item of items) {
    const { rows } = await pool.query(
      `INSERT INTO prescription_items (prescription_id, medicine_id, dosage, quantity, instructions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [prescription.id, item.medicine_id, item.dosage || null, item.quantity, item.instructions || null]
    );
    insertedItems.push(rows[0]);
  }

  res.status(201).json({ data: { ...prescription, items: insertedItems } });
}

// GET /prescriptions/:id — detail with a stock indicator per item, used by
// the doctor/cashier to see which items were already known to be short.
async function getById(req, res) {
  const { id } = req.params;

  const { rows: prescriptionRows } = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [id]);
  const prescription = prescriptionRows[0];

  if (!prescription) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prescription not found' } });
  }

  const { rows: items } = await pool.query(
    `SELECT pi.id, pi.dosage, pi.quantity, pi.instructions, pi.status,
            m.id AS medicine_id, m.name AS medicine_name, m.stock_qty,
            (m.stock_qty <= 0) AS is_out_of_stock
     FROM prescription_items pi
     JOIN medicines m ON m.id = pi.medicine_id
     WHERE pi.prescription_id = $1
     ORDER BY pi.created_at ASC`,
    [id]
  );

  res.json({ data: { ...prescription, items } });
}

export default { list, create, getById };
