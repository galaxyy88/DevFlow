import test from "node:test";
import assert from "node:assert/strict";
import {
  createProjectSchema,
  createTaskSchema,
  loginSchema,
  projectListQuerySchema,
  registerSchema,
  taskListQuerySchema,
  updateProjectSchema
} from "./validation.js";
import { completionPercent } from "./dashboard.js";
import { getPagination } from "./pagination.js";
import { escapeHtml } from "../../client/utils/format.js";

test("normalizes email and trims user names", () => {
  const result = registerSchema.parse({
    name: "  Ana Costa  ",
    email: " ANA@EXAMPLE.COM ",
    password: "senha-segura"
  });
  assert.equal(result.name, "Ana Costa");
  assert.equal(result.email, "ana@example.com");
});

test("rejects short passwords and malformed email addresses", () => {
  assert.equal(registerSchema.safeParse({
    name: "Ana",
    email: "ana@example.com",
    password: "curta"
  }).success, false);
  assert.equal(loginSchema.safeParse({ email: "invalido", password: "senha" }).success, false);
  assert.equal(registerSchema.safeParse({
    name: "Ana",
    email: "ana@example.com",
    password: "🙂".repeat(20)
  }).success, false);
});

test("applies project and task defaults", () => {
  assert.equal(createProjectSchema.parse({ name: "Site" }).priority, "media");
  assert.equal(createTaskSchema.parse({ title: "Revisar PR" }).status, "a_fazer");
});

test("rejects empty project updates and invalid states", () => {
  assert.equal(updateProjectSchema.safeParse({}).success, false);
  assert.equal(createProjectSchema.safeParse({ name: "Site", status: "invalido" }).success, false);
  assert.equal(createTaskSchema.safeParse({ title: "Entrega", dueDate: "2026-02-30" }).success, false);
});

test("bounds pagination values", () => {
  assert.deepEqual(getPagination({ page: "-3", limit: "500" }), { page: 1, limit: 100, offset: 0 });
  assert.equal(projectListQuerySchema.safeParse({ status: "qualquer" }).success, false);
  assert.equal(taskListQuerySchema.safeParse({ sort: "random" }).success, false);
});

test("calculates completion percentage without dividing by zero", () => {
  assert.equal(completionPercent(2, 3), 67);
  assert.equal(completionPercent(0, 0), 0);
});

test("escapes user-provided text before it is rendered as HTML", () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script> & 'test'`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;test&#39;"
  );
});
