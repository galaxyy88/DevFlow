import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on("error", (error) => {
  if (env.NODE_ENV === "production") {
    console.error("Erro inesperado no pool PostgreSQL:", { code: error.code });
  } else {
    console.error("Erro inesperado no pool PostgreSQL:", error);
  }
});
