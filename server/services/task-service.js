import { pool } from "../database/pool.js";
import { ApiError } from "../utils/api-error.js";
import { createUpdateClause, getPagination } from "../utils/pagination.js";

const taskColumns = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  dueDate: "due_date"
};

const taskOrder = {
  dueDate: "t.due_date ASC NULLS LAST, t.created_at DESC",
  priority: "CASE t.priority WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END, t.created_at DESC",
  updatedAt: "t.updated_at DESC"
};

export async function listProjectTasks(userId, projectId, query) {
  const { page, limit, offset } = getPagination(query);
  const status = query.status || null;
  const search = query.search?.trim() ?? "";
  const order = taskOrder[query.sort] || taskOrder.updatedAt;
  const values = [projectId, userId, status, `%${search}%`];
  const where = `p.id = $1 AND p.user_id = $2
    AND ($3::text IS NULL OR t.status = $3)
    AND ($4 = '%%' OR t.title ILIKE $4 OR t.description ILIKE $4)`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM tasks t
     JOIN projects p ON p.id = t.project_id WHERE ${where}`,
    values
  );
  const result = await pool.query(
    `SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,
            t.due_date, t.created_at, t.updated_at
     FROM tasks t JOIN projects p ON p.id = t.project_id
     WHERE ${where}
     ORDER BY ${order}
     LIMIT $5 OFFSET $6`,
    [...values, limit, offset]
  );

  return { items: result.rows, pagination: { page, limit, total: countResult.rows[0].total } };
}

export async function createTask(userId, projectId, task) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date)
     SELECT p.id, $3, $4, $5, $6, $7 FROM projects p
     WHERE p.id = $1 AND p.user_id = $2
     RETURNING id, project_id, title, description, status, priority, due_date, created_at, updated_at`,
    [projectId, userId, task.title, task.description, task.status, task.priority, task.dueDate ?? null]
  );

  if (!rows.length) {
    throw new ApiError(404, "Projeto não encontrado.", "NOT_FOUND");
  }
  return rows[0];
}

export async function updateTask(userId, taskId, fields) {
  const clause = createUpdateClause(fields, taskColumns);

  if (!clause) {
    throw new ApiError(400, "Informe ao menos um campo para atualizar.", "VALIDATION_ERROR");
  }

  const { rows } = await pool.query(
    `UPDATE tasks t SET ${clause.assignments}
     FROM projects p
     WHERE t.project_id = p.id AND t.id = $${clause.values.length + 1}
       AND p.user_id = $${clause.values.length + 2}
     RETURNING t.id, t.project_id, t.title, t.description, t.status, t.priority,
               t.due_date, t.created_at, t.updated_at`,
    [...clause.values, taskId, userId]
  );

  if (!rows.length) {
    throw new ApiError(404, "Tarefa não encontrada.", "NOT_FOUND");
  }
  return rows[0];
}

export async function deleteTask(userId, taskId) {
  const result = await pool.query(
    `DELETE FROM tasks t USING projects p
     WHERE t.project_id = p.id AND t.id = $1 AND p.user_id = $2`,
    [taskId, userId]
  );

  if (!result.rowCount) {
    throw new ApiError(404, "Tarefa não encontrada.", "NOT_FOUND");
  }
}
