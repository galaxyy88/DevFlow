import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
let parsedTestDatabaseUrl;

try {
  parsedTestDatabaseUrl = testDatabaseUrl ? new URL(testDatabaseUrl) : null;
} catch {
  parsedTestDatabaseUrl = null;
}

const testDatabaseName = parsedTestDatabaseUrl?.pathname.slice(1);
const localSocket = parsedTestDatabaseUrl?.searchParams.get("host");
const isLocalTestDatabase = parsedTestDatabaseUrl && (
  ["localhost", "127.0.0.1", "::1"].includes(parsedTestDatabaseUrl.hostname) ||
  Boolean(localSocket?.startsWith("/"))
);

if (!isLocalTestDatabase || !testDatabaseName?.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL deve apontar para um PostgreSQL local separado, com nome terminado em _test.");
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV ||= "test";

const [{ default: app }, { migrate }, { pool }, { env }, { errorHandler }] = await Promise.all([
  import("./app.js"),
  import("./database/migrate.js"),
  import("./database/pool.js"),
  import("./config/env.js"),
  import("./middleware/error-handler.js")
]);

let server;
let baseUrl;

before(async () => {
  await migrate();
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  await pool.end();
});

async function api(path, { method = "GET", token, body, origin } = {}) {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (origin) headers.set("Origin", origin);

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function expectNoSensitiveValue(text, sensitiveValue) {
  if (sensitiveValue && text.includes(sensitiveValue)) {
    throw new Error("A resposta ou log contém um valor sensível.");
  }
}

test("HTTP flows preserve data and isolate project and task owners", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const credentialsA = {
    name: "DevFlow User A",
    email: `devflow-a-${suffix}@example.test`,
    password: "valid-test-password-a"
  };
  const credentialsB = {
    name: "DevFlow User B",
    email: `devflow-b-${suffix}@example.test`,
    password: "valid-test-password-b"
  };
  let userAId;
  let userBId;

  try {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /DevFlow/);
    assert.equal((await fetch(`${baseUrl}/app.js`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/pages/dashboard.js`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/styles/main.css`)).status, 200);
    assert.deepEqual(await (await api("/health")).json(), { status: "ok" });
    assert.deepEqual(await (await api("/api/health")).json(), { status: "ok" });

    const sameOriginResponse = await api("/health", { origin: baseUrl });
    assert.equal(sameOriginResponse.status, 200);
    assert.equal(sameOriginResponse.headers.has("access-control-allow-origin"), false);

    const crossOriginResponse = await api("/health", { origin: "https://untrusted.example" });
    assert.equal(crossOriginResponse.status, 200);
    assert.equal(crossOriginResponse.headers.has("access-control-allow-origin"), false);

    const invalidJson = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });
    assert.equal(invalidJson.status, 400);
    assert.equal((await invalidJson.json()).error.code, "INVALID_JSON");

    const invalidInput = await api("/api/auth/register", {
      method: "POST",
      body: { name: "A", email: "invalid", password: "short" }
    });
    assert.equal(invalidInput.status, 400);
    assert.equal((await invalidInput.json()).error.code, "VALIDATION_ERROR");

    for (const token of [
      "not-a-jwt",
      jwt.sign({ version: 0 }, env.JWT_SECRET, {
        subject: "75a97c58-344a-47bd-ad67-e21176fd7424",
        expiresIn: -1,
        algorithm: "HS256",
        issuer: "devflow",
        audience: "devflow"
      }),
      jwt.sign({ version: 0 }, env.JWT_SECRET, {
        subject: "75a97c58-344a-47bd-ad67-e21176fd7424",
        expiresIn: "1h",
        algorithm: "HS384",
        issuer: "devflow",
        audience: "devflow"
      }),
      jwt.sign({ version: 0 }, env.JWT_SECRET, {
        subject: "75a97c58-344a-47bd-ad67-e21176fd7424",
        expiresIn: "9h",
        algorithm: "HS256",
        issuer: "devflow",
        audience: "devflow"
      }),
      jwt.sign({ version: 0 }, "an-unrelated-test-signing-secret", {
        subject: "75a97c58-344a-47bd-ad67-e21176fd7424",
        expiresIn: "1h",
        algorithm: "HS256",
        issuer: "devflow",
        audience: "devflow"
      }),
      jwt.sign({}, env.JWT_SECRET, {
        subject: "75a97c58-344a-47bd-ad67-e21176fd7424",
        expiresIn: "1h",
        algorithm: "HS256",
        issuer: "devflow",
        audience: "devflow"
      })
    ]) {
      assert.equal((await api("/api/auth/me", { token })).status, 401);
    }

    const registrationA = await api("/api/auth/register", { method: "POST", body: credentialsA });
    assert.equal(registrationA.status, 201);
    const registrationText = await registrationA.text();
    expectNoSensitiveValue(registrationText, credentialsA.password);
    expectNoSensitiveValue(registrationText, env.JWT_SECRET);
    expectNoSensitiveValue(registrationText, env.DATABASE_URL);
    const sessionA = JSON.parse(registrationText);
    userAId = sessionA.user.id;
    assert.ok(sessionA.token);
    assert.equal(jwt.decode(sessionA.token, { complete: true }).header.alg, "HS256");
    assert.deepEqual(
      Object.keys(jwt.decode(sessionA.token)).sort(),
      ["aud", "exp", "iat", "iss", "sub", "version"]
    );

    const storedPassword = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userAId]
    );
    if (!storedPassword.rows[0].password_hash.startsWith("$2") ||
        storedPassword.rows[0].password_hash === credentialsA.password) {
      throw new Error("A senha não foi armazenada exclusivamente como hash bcrypt.");
    }

    const registrationB = await api("/api/auth/register", { method: "POST", body: credentialsB });
    assert.equal(registrationB.status, 201);
    const sessionB = await registrationB.json();
    userBId = sessionB.user.id;

    const login = await api("/api/auth/login", {
      method: "POST",
      body: { email: credentialsA.email, password: credentialsA.password }
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.id, userAId);
    assert.equal((await api("/api/auth/login", {
      method: "POST",
      body: { email: credentialsA.email, password: "invalid-test-password" }
    })).status, 401);

    assert.equal((await api("/api/projects")).status, 401);

    const createdProjectResponse = await api("/api/projects", {
      method: "POST",
      token: sessionA.token,
      body: { name: "Integration project", description: "Original description", priority: "alta" }
    });
    assert.equal(createdProjectResponse.status, 201);
    const project = (await createdProjectResponse.json()).project;

    const projectDetails = await api(`/api/projects/${project.id}`, { token: sessionA.token });
    assert.equal(projectDetails.status, 200);

    const updatedProjectResponse = await api(`/api/projects/${project.id}`, {
      method: "PUT",
      token: sessionA.token,
      body: { name: "Updated integration project" }
    });
    assert.equal(updatedProjectResponse.status, 200);
    assert.equal((await updatedProjectResponse.json()).project.name, "Updated integration project");

    const createdTaskResponse = await api(`/api/projects/${project.id}/tasks`, {
      method: "POST",
      token: sessionA.token,
      body: { title: "Integration task", description: "Task description", priority: "urgente" }
    });
    assert.equal(createdTaskResponse.status, 201);
    const task = (await createdTaskResponse.json()).task;

    const schema = await readFile(new URL("./database/schema.sql", import.meta.url), "utf8");
    const migrationClient = await pool.connect();
    try {
      await migrationClient.query("BEGIN");
      await migrationClient.query(schema);
      await migrationClient.query("COMMIT");
    } catch (error) {
      await migrationClient.query("ROLLBACK");
      throw error;
    } finally {
      migrationClient.release();
    }
    assert.equal((await pool.query("SELECT id FROM tasks WHERE id = $1", [task.id])).rowCount, 1);

    const listedTasks = await api(`/api/projects/${project.id}/tasks?search=Integration`, {
      token: sessionA.token
    });
    assert.equal(listedTasks.status, 200);
    assert.equal((await listedTasks.json()).items.length, 1);

    const updatedTaskResponse = await api(`/api/tasks/${task.id}`, {
      method: "PUT",
      token: sessionA.token,
      body: { status: "concluida", title: "Updated integration task" }
    });
    assert.equal(updatedTaskResponse.status, 200);
    assert.equal((await updatedTaskResponse.json()).task.status, "concluida");

    const dashboardResponse = await api("/api/dashboard", { token: sessionA.token });
    assert.equal(dashboardResponse.status, 200);
    assert.equal((await dashboardResponse.json()).stats.completedTasks, 1);

    assert.equal((await api("/api/projects", { token: sessionB.token })).status, 200);
    assert.equal((await (await api("/api/projects", { token: sessionB.token })).json()).items.length, 0);
    assert.equal((await (await api(`/api/projects/${project.id}/tasks`, {
      token: sessionB.token
    })).json()).items.length, 0);
    assert.equal((await api(`/api/projects/${project.id}`, { token: sessionB.token })).status, 404);
    assert.equal((await api(`/api/projects/${project.id}`, {
      method: "PUT",
      token: sessionB.token,
      body: { name: "Unauthorized update" }
    })).status, 404);
    assert.equal((await api(`/api/projects/${project.id}`, {
      method: "DELETE",
      token: sessionB.token
    })).status, 404);
    assert.equal((await api(`/api/projects/${project.id}/tasks`, {
      method: "POST",
      token: sessionB.token,
      body: { title: "Unauthorized task" }
    })).status, 404);
    assert.equal((await api(`/api/tasks/${task.id}`, {
      method: "PUT",
      token: sessionB.token,
      body: { title: "Unauthorized update" }
    })).status, 404);
    assert.equal((await api(`/api/tasks/${task.id}`, {
      method: "DELETE",
      token: sessionB.token
    })).status, 404);

    await migrate();
    assert.equal((await api(`/api/projects/${project.id}`, { token: sessionA.token })).status, 200);
    assert.equal((await api(`/api/tasks/${task.id}`, {
      method: "DELETE",
      token: sessionA.token
    })).status, 204);

    const cascadeTaskResponse = await api(`/api/projects/${project.id}/tasks`, {
      method: "POST",
      token: sessionA.token,
      body: { title: "Cascade task" }
    });
    assert.equal(cascadeTaskResponse.status, 201);
    const cascadeTask = (await cascadeTaskResponse.json()).task;

    assert.equal((await api(`/api/projects/${project.id}`, {
      method: "DELETE",
      token: sessionA.token
    })).status, 204);
    assert.equal((await api(`/api/tasks/${cascadeTask.id}`, {
      method: "DELETE",
      token: sessionA.token
    })).status, 404);
    assert.equal((await api("/api/auth/logout", {
      method: "POST",
      token: sessionA.token
    })).status, 204);
    assert.equal((await api("/api/auth/me", { token: sessionA.token })).status, 401);

    const rateLimitResponses = [];
    for (let index = 0; index < 8; index += 1) {
      rateLimitResponses.push(await api("/api/auth/login", {
        method: "POST",
        body: { email: `unknown-${suffix}@example.test`, password: "invalid-test-password" }
      }));
    }
    assert.ok(rateLimitResponses.some((response) => response.status === 429));
  } finally {
    if (userAId) await pool.query("DELETE FROM users WHERE id = $1", [userAId]);
    if (userBId) await pool.query("DELETE FROM users WHERE id = $1", [userBId]);
  }
});

test("internal API errors log and return no raw error details", () => {
  const sentinel = "test-only-sensitive-error-value";
  const logs = [];
  const originalError = console.error;
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  console.error = (...args) => logs.push(args.map(String).join(" "));

  try {
    errorHandler(new Error(sentinel), {}, response, (error) => {
      throw error;
    });
  } finally {
    console.error = originalError;
  }

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error.code, "INTERNAL_ERROR");
  assert.equal(response.body.error.message, "Ocorreu um erro interno. Tente novamente.");
  expectNoSensitiveValue(JSON.stringify(response.body), sentinel);
  expectNoSensitiveValue(logs.join(" "), sentinel);
  expectNoSensitiveValue(logs.join(" "), env.JWT_SECRET);
  expectNoSensitiveValue(logs.join(" "), env.DATABASE_URL);
});
