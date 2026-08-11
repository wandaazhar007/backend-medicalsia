import pool from '../config/db.js';

// GET /wilayah?level=&parent=&search=&limit= — autosuggest source for the
// patient form's address fields. `level` (1=provinsi, 2=kota/kabupaten,
// 3=kecamatan, 4=kelurahan/desa) is required; `parent` (the parent row's
// kode) narrows results to that parent's children for cascading
// provinsi->kota->kecamatan->kelurahan selection — optional, since the
// frontend also allows free typing without picking a parent first.
async function list(req, res) {
  const level = parseInt(req.query.level, 10);
  const { parent, search } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  if (![1, 2, 3, 4].includes(level)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'level must be 1-4' } });
  }

  const conditions = ['level = $1'];
  const params = [level];

  if (parent) {
    params.push(parent);
    conditions.push(`parent_kode = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`nama ILIKE $${params.length}`);
  }

  params.push(limit);

  const { rows } = await pool.query(
    `SELECT kode, nama, kode_pos FROM wilayah WHERE ${conditions.join(' AND ')} ORDER BY nama ASC LIMIT $${params.length}`,
    params
  );

  res.json({ data: rows });
}

export default { list };
