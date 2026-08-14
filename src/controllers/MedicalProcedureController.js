import pool from '../config/db.js';

// GET /medical-procedures?page=&limit=&search=
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const search = req.query.search ? `%${req.query.search}%` : null;
  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE name ILIKE $1' : '';
  const params = search ? [search] : [];

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM medical_procedures ${whereClause}`,
    params
  );
  const totalItems = countRows[0].total;

  const { rows } = await pool.query(
    `SELECT id, name, price, is_active
     FROM medical_procedures
     ${whereClause}
     ORDER BY name ASC
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

async function create(req, res) {
  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and price are required' } });
  }

  const { rows } = await pool.query(
    'INSERT INTO medical_procedures (name, price) VALUES ($1, $2) RETURNING id, name, price, is_active',
    [name, price]
  );

  res.status(201).json({ data: rows[0] });
}

async function update(req, res) {
  const { id } = req.params;
  const { name, price, is_active } = req.body;

  const { rows } = await pool.query(
    `UPDATE medical_procedures
     SET name = COALESCE($1, name),
         price = COALESCE($2, price),
         is_active = COALESCE($3, is_active)
     WHERE id = $4
     RETURNING id, name, price, is_active`,
    [name ?? null, price ?? null, is_active ?? null, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medical procedure not found' } });
  }

  res.json({ data: rows[0] });
}

export default { list, create, update };
