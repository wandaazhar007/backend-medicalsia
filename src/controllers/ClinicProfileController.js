import pool from '../config/db.js';

// clinic_profile only ever holds a single row for this deployment.
async function get(req, res) {
  const { rows } = await pool.query('SELECT * FROM clinic_profile LIMIT 1');
  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Clinic profile has not been set up yet' } });
  }
  res.json({ data: rows[0] });
}

async function update(req, res) {
  const { name, address, phone, logo_url } = req.body;

  const { rows: existingRows } = await pool.query('SELECT id FROM clinic_profile LIMIT 1');
  if (!existingRows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Clinic profile has not been set up yet' } });
  }

  const { rows } = await pool.query(
    `UPDATE clinic_profile
     SET name = COALESCE($1, name),
         address = COALESCE($2, address),
         phone = COALESCE($3, phone),
         logo_url = COALESCE($4, logo_url)
     WHERE id = $5
     RETURNING *`,
    [name, address, phone, logo_url, existingRows[0].id]
  );

  res.json({ data: rows[0] });
}

export default { get, update };
