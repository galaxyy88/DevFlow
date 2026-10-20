import { escapeHtml, formatDate, labelFor } from "../utils/format.js";

const taskStatuses = ["a_fazer", "em_andamento", "em_revisao", "concluida"];

export function renderTasks(root, { projects, tasks, selectedProject, search, status, sort }) {
  const projectOptions = projects.map((project) =>
    `<option value="${project.id}" ${project.id === selectedProject ? "selected" : ""}>${escapeHtml(project.name)}</option>`
  ).join("");
  const rows = tasks.map((task) => `<tr>
    <td><div class="task-title-cell"><span class="task-checkbox ${task.status === "concluida" ? "task-checkbox-done" : ""}" aria-hidden="true">${task.status === "concluida" ? "✓" : ""}</span><span><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.description || "Sem descrição")}</small></span></div></td>
    <td><select class="inline-select status-select" data-task-status="${task.id}" aria-label="Status de ${escapeHtml(task.title)}">${optionList(taskStatuses, task.status)}</select></td>
    <td><span class="priority-dot priority-${task.priority}"></span>${escapeHtml(labelFor(task.priority))}</td>
    <td>${escapeHtml(formatDate(task.due_date))}</td>
    <td><button class="icon-button" data-edit-task="${task.id}" aria-label="Editar ${escapeHtml(task.title)}">···</button></td>
  </tr>`).join("");

  root.innerHTML = `
    <div class="welcome-row page-heading"><div><span class="eyebrow">PRÓXIMOS PASSOS</span><h1>Suas tarefas</h1><p>Transforme planos em pequenas entregas concretas.</p></div><button class="button button-primary" data-new-task ${selectedProject ? "" : "disabled"}><span>＋</span> Nova tarefa</button></div>
    ${projects.length ? `<section class="panel list-panel"><div class="list-toolbar task-toolbar"><select id="task-project" class="toolbar-select" aria-label="Selecionar projeto">${projectOptions}</select><label class="search-box"><span>⌕</span><input id="task-search" type="search" placeholder="Buscar tarefas..." value="${escapeHtml(search)}"></label><select id="task-filter" class="toolbar-select" aria-label="Filtrar por status"><option value="">Todos os status</option>${optionList(taskStatuses, status)}</select><select id="task-sort" class="toolbar-select" aria-label="Ordenar tarefas"><option value="updatedAt" ${sort === "updatedAt" ? "selected" : ""}>Mais recentes</option><option value="dueDate" ${sort === "dueDate" ? "selected" : ""}>Prazo</option><option value="priority" ${sort === "priority" ? "selected" : ""}>Prioridade</option></select></div>
      ${rows ? `<div class="table-wrap"><table><thead><tr><th>TAREFA</th><th>STATUS</th><th>PRIORIDADE</th><th>PRAZO</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty-state compact-empty"><span class="empty-illustration">☷</span><h3>Nenhuma tarefa por aqui</h3><p>Crie uma tarefa ou ajuste os filtros para encontrar resultados.</p><button class="button button-primary" data-new-task>Criar tarefa</button></div>`}</section>` : `<section class="panel"><div class="empty-state"><span class="empty-illustration">▤</span><h3>Crie um projeto primeiro</h3><p>As tarefas ficam organizadas dentro de cada projeto.</p><button class="button button-primary" data-new-project>Criar projeto</button></div></section>`}`;
}

function optionList(values, selected = "") {
  return values.map((value) =>
    `<option value="${value}" ${selected === value ? "selected" : ""}>${escapeHtml(labelFor(value))}</option>`
  ).join("");
}
