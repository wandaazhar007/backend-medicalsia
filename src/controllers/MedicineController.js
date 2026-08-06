import pool from '../config/db.js';

// GET /medicines?page=&limit=&search= — read-only for now (the prescription
// picker). Create/stock-adjustment endpoints belong to Fase 5 (Farmasi).
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const search = req.query.search ? `%${req.query.search}%` : null;
  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE name ILIKE $1' : '';
  const params = search ? [search] : [];

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM medicines ${whereClause}`,
    params
  );
  const totalItems = countRows[0].total;

  const { rows } = await pool.query(
    `SELECT id, name, unit, price, stock_qty, is_active
     FROM medicines
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

export default { list };
