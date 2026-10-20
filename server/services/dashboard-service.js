import { pool } from "../database/pool.js";
import { completionPercent } from "../utils/dashboard.js";

export async function getDashboard(userId) {
  const [projectsResult, tasksResult, activityResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'em_andamento')::int AS active,
              COUNT(*) FILTER (WHERE status = 'concluido')::int AS completed,
              COUNT(*) FILTER (WHERE status <> 'arquivado')::int AS visible
       FROM projects WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE t.status <> 'concluida')::int AS pending,
              COUNT(*) FILTER (WHERE t.status = 'concluida')::int AS completed,
              COUNT(*) FILTER (WHERE t.status <> 'concluida' AND t.due_date < CURRENT_DATE)::int AS overdue,
              COUNT(*)::int AS total
       FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE p.user_id = $1 AND p.status <> 'arquivado'`,
      [userId]
    ),
    pool.query(
      `(
        SELECT p.id, p.name AS title, 'project' AS type, p.updated_at AS occurred_at
        FROM projects p WHERE p.user_id = $1
      )
      UNION ALL
      (
        SELECT t.id, t.title, 'task' AS type, t.updated_at AS occurred_at
        FROM tasks t JOIN projects p ON p.id = t.project_id WHERE p.user_id = $1
      )
      ORDER BY occurred_at DESC
      LIMIT 8`,
      [userId]
    )
  ]);

  const projects = projectsResult.rows[0];
  const tasks = tasksResult.rows[0];

  return {
    stats: {
      totalProjects: projects.total,
      activeProjects: projects.active,
      pendingTasks: tasks.pending,
      completedTasks: tasks.completed,
      overdueTasks: tasks.overdue,
      completionPercent: completionPercent(tasks.completed, tasks.total)
    },
    recentActivity: activityResult.rows
  };
}
