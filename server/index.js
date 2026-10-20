import app from "./app.js";
import { env } from "./config/env.js";
import { migrate } from "./database/migrate.js";
import { pool } from "./database/pool.js";
import { logSafeError } from "./utils/safe-log.js";

let server;

async function start() {
  await migrate();
  server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`DevFlow iniciado na porta ${env.PORT}.`);
  });
}

async function shutdown() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  await pool.end();
}

start().catch(async (error) => {
  logSafeError("Não foi possível iniciar o DevFlow.", error);
  await shutdown();
  process.exitCode = 1;
});

let isShuttingDown = false;

function handleShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  shutdown().catch((error) => {
    logSafeError("Erro ao encerrar o DevFlow.", error);
    process.exitCode = 1;
  });
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
