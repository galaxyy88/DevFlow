import { pool } from "../database/pool.js";
import { ApiError } from "../utils/api-error.js";
import { createUpdateClause, getPagination } from "../utils/pagination.js";

const projectColumns = {
  name: "name",
  description: "description",
  status: "status",
  priority: "priority",
  dueDate: "due_date"
};

export async function listProjects(userId, query) {
  const { page, limit, offset } = getPagination(query);
  const search = query.search?.trim() ?? "";
  const status = query.status || null;
  const values = [userId, status, `%${search}%`];

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM projects
     WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
       AND ($3 = '%%' OR name ILIKE $3 OR description ILIKE $3)`,
    values
  );
  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.status, p.priority, p.due_date,
            p.created_at, p.updated_at,
            COUNT(t.id)::int AS task_count,
            COUNT(t.id) FILTER (WHERE t.status = 'concluida')::int AS completed_task_count
     FROM projects p
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.user_id = $1 AND ($2::text IS NULL OR p.status = $2)
       AND ($3 = '%%' OR p.name ILIKE $3 OR p.description ILIKE $3)
     GROUP BY p.id
     ORDER BY p.updated_at DESC
     LIMIT $4 OFFSET $5`,
    [...values, limit, offset]
  );

  return { items: result.rows, pagination: { page, limit, total: countResult.rows[0].total } };
}

export async function getProject(userId, projectId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.description, p.status, p.priority, p.due_date,
            p.created_at, p.updated_at,
            COUNT(t.id)::int AS task_count,
            COUNT(t.id) FILTER (WHERE t.status = 'concluida')::int AS completed_task_count
     FROM projects p
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.id = $1 AND p.user_id = $2
     GROUP BY p.id`,
    [projectId, userId]
  );

  if (!rows.length) {
    throw new ApiError(404, "Projeto não encontrado.", "NOT_FOUND");
  }
  return rows[0];
}

export async function createProject(userId, project) {
  const { rows } = await pool.query(
    `INSERT INTO projects (user_id, name, description, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, status, priority, due_date, created_at, updated_at`,
    [userId, project.name, project.description, project.status, project.priority, project.dueDate ?? null]
  );
  return rows[0];
}

export async function updateProject(userId, projectId, fields) {
  const clause = createUpdateClause(fields, projectColumns);

  if (!clause) {
    throw new ApiError(400, "Informe ao menos um campo para atualizar.", "VALIDATION_ERROR");
  }

  const { rows } = await pool.query(
    `UPDATE projects SET ${clause.assignments}
     WHERE id = $${clause.values.length + 1} AND user_id = $${clause.values.length + 2}
     RETURNING id, name, description, status, priority, due_date, created_at, updated_at`,
    [...clause.values, projectId, userId]
  );

  if (!rows.length) {
    throw new ApiError(404, "Projeto não encontrado.", "NOT_FOUND");
  }
  return rows[0];
}

export async function deleteProject(userId, projectId) {
  const result = await pool.query("DELETE FROM projects WHERE id = $1 AND user_id = $2", [projectId, userId]);
  if (!result.rowCount) {
    throw new ApiError(404, "Projeto não encontrado.", "NOT_FOUND");
  }
}
