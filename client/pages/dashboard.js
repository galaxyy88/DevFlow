import { escapeHtml, formatDate, labelFor } from "../utils/format.js";

export function renderDashboard(root, { user, projects, dashboard }) {
  const stats = dashboard.stats;
  const recent = dashboard.recentActivity.length
    ? dashboard.recentActivity.map((item) => `
        <li class="activity-item">
          <span class="activity-icon ${item.type === "task" ? "activity-task" : "activity-project"}">${item.type === "task" ? "✓" : "▤"}</span>
          <span class="activity-copy"><strong>${escapeHtml(item.title)}</strong><small>${item.type === "task" ? "Tarefa atualizada" : "Projeto atualizado"}</small></span>
          <time>${escapeHtml(formatDate(item.occurred_at))}</time>
        </li>`).join("")
    : `<li class="empty-inline">Sua atividade recente aparecerá aqui.</li>`;
  const projectCards = projects.length
    ? projects.map(renderProjectCard).join("")
    : `<div class="empty-state"><span class="empty-illustration">▤</span><h3>Seu próximo projeto começa aqui</h3><p>Crie um projeto para organizar ideias e acompanhar o progresso.</p><button class="button button-primary" data-new-project>Criar primeiro projeto</button></div>`;

  root.innerHTML = `
    <div class="welcome-row"><div><span class="eyebrow">SEU ESPAÇO DE TRABALHO</span><h1>Olá, ${escapeHtml(user?.name?.split(" ")[0] || "por aí")} <span class="wave">✳</span></h1><p>Um bom dia para tirar ideias do papel.</p></div><button class="button button-primary" data-new-project><span>＋</span> Novo projeto</button></div>
    <section class="stats-grid" aria-label="Resumo do dashboard">
      ${statCard("Projetos", stats.totalProjects, "Todos os seus projetos", "▤", "violet")}
      ${statCard("Em andamento", stats.activeProjects, "Projetos ativos", "↗", "blue")}
      ${statCard("Tarefas pendentes", stats.pendingTasks, "Ainda precisam de atenção", "◷", "orange")}
      ${statCard("Tarefas concluídas", stats.completedTasks, `${stats.overdueTasks} atrasadas`, "✓", "green")}
    </section>
    <div class="dashboard-grid">
      <section class="panel project-panel"><div class="section-heading"><div><span class="eyebrow">ACOMPANHAMENTO</span><h2>Projetos recentes</h2></div><button class="text-button" data-page="projects">Ver todos <span>→</span></button></div><div class="project-grid">${projectCards}</div></section>
      <section class="panel activity-panel"><div class="section-heading"><div><span class="eyebrow">O QUE ESTÁ ACONTECENDO</span><h2>Atividade recente</h2></div><span class="live-dot" aria-label="Atualizado"></span></div><ul class="activity-list">${recent}</ul></section>
    </div>`;
}

export function renderProjectCard(project) {
  const percent = project.task_count
    ? Math.round((Number(project.completed_task_count) / Number(project.task_count)) * 100)
    : 0;

  return `<article class="project-card">
    <div class="project-card-top"><span class="project-mark">${escapeHtml(project.name.slice(0, 1).toUpperCase())}</span><button class="icon-button project-menu" data-edit-project="${project.id}" aria-label="Editar ${escapeHtml(project.name)}">···</button></div>
    <h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description || "Sem descrição")}</p>
    <div class="project-meta"><span class="status-pill status-${project.status}">${escapeHtml(labelFor(project.status))}</span><span class="priority-label">${escapeHtml(labelFor(project.priority))}</span></div>
    <div class="progress-meta"><span>Progresso</span><strong>${percent}%</strong></div><progress class="progress-track" max="100" value="${percent}" aria-label="Progresso do projeto">${percent}%</progress>
    <div class="project-card-footer"><span>${project.completed_task_count}/${project.task_count} tarefas</span><span>${escapeHtml(formatDate(project.due_date))}</span></div>
  </article>`;
}

function statCard(title, value, subtitle, icon, color) {
  return `<article class="stat-card"><div class="stat-top"><span>${escapeHtml(title)}</span><span class="stat-icon stat-${color}">${icon}</span></div><strong class="stat-value">${value}</strong><small>${escapeHtml(subtitle)}</small></article>`;
}
