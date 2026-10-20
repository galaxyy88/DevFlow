import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import app from "./app.js";
import { migrate } from "./database/migrate.js";
import { pool } from "./database/pool.js";

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

test("production HTTP flows preserve data and isolate project and task owners", async () => {
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

    const allowedOrigin = process.env.RENDER_EXTERNAL_URL
      ? new URL(process.env.RENDER_EXTERNAL_URL).origin
      : "http://localhost:3000";
    const allowedHealth = await api("/health", { origin: allowedOrigin });
    assert.equal(allowedHealth.status, 200);
    assert.equal(allowedHealth.headers.get("access-control-allow-origin"), allowedOrigin);

    const deniedHealth = await api("/health", { origin: "https://untrusted.example" });
    assert.equal(deniedHealth.status, 403);

    const registrationA = await api("/api/auth/register", { method: "POST", body: credentialsA });
    assert.equal(registrationA.status, 201);
    const sessionA = await registrationA.json();
    userAId = sessionA.user.id;
    assert.ok(sessionA.token);

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
  } finally {
    if (userAId) await pool.query("DELETE FROM users WHERE id = $1", [userAId]);
    if (userBId) await pool.query("DELETE FROM users WHERE id = $1", [userBId]);
  }
});
