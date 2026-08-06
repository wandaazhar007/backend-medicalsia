import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Single deployment = single clinic database, no multi-tenant pooling logic needed.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
