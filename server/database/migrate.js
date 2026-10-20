import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";
import { logSafeError } from "../utils/safe-log.js";

const migrationPath = new URL("./schema.sql", import.meta.url);
const initialSchemaVersion = "001_initial_schema";
const migrationLock = 864201;

export async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [migrationLock]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    const applied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version = $1",
      [initialSchemaVersion]
    );

    if (!applied.rowCount) {
      const schema = await readFile(fileURLToPath(migrationPath), "utf8");
      await client.query(schema);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [initialSchemaVersion]
      );
    }

    await client.query("COMMIT");
    console.log("Migrações do DevFlow verificadas.");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logSafeError("Falha ao reverter transação de migração.", rollbackError);
    }

    logSafeError("Falha ao aplicar migrações do DevFlow.", error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await migrate();
  } catch (error) {
    logSafeError("Não foi possível aplicar migrações do banco.", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
