import pg from "pg";
import { env } from "../config/env.js";
import { logSafeError } from "../utils/safe-log.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on("error", (error) => {
  logSafeError("Erro inesperado no pool PostgreSQL.", error);
});
