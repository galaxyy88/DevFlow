import { clearToken, getToken, request, saveToken } from "./services/api.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderProjects } from "./pages/projects.js";
import { renderTasks } from "./pages/tasks.js";
import { escapeHtml, initials, labelFor } from "./utils/format.js";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const state = {
  user: null,
  page: "dashboard",
  projects: [],
  tasks: [],
  selectedProject: "",
  projectSearch: "",
  taskSearch: "",
  taskStatus: "",
  taskSort: "updatedAt",
  navigationRequestId: 0,
  busy: false
};

const projectStatuses = ["planejamento", "em_andamento", "concluido", "arquivado"];
const taskStatuses = ["a_fazer", "em_andamento", "em_revisao", "concluida"];
const priorities = ["baixa", "media", "alta", "urgente"];

function optionList(values, selected = "") {
  return values.map((value) =>
    `<option value="${value}" ${selected === value ? "selected" : ""}>${escapeHtml(labelFor(value))}</option>`
  ).join("");
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3500);
}

function setLoading(loading) {
  state.busy = loading;
  app.querySelectorAll("button[type=submit]").forEach((button) => {
    button.disabled = loading;
    button.dataset.originalText ||= button.textContent;
    button.textContent = loading ? "Salvando..." : button.dataset.originalText;
  });
}

async function runAction(action, successMessage) {
  if (state.busy) return;
  setLoading(true);
  try {
    await action();
    if (successMessage) showToast(successMessage);
  } catch (error) {
    if (error.status === 401) {
      await signOut(false);
      return;
    }
    showToast(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function renderAuth(mode = "login") {
  const registering = mode === "register";
  app.innerHTML = `
    <main class="auth-screen">
      <section class="auth-panel">
        <a class="brand auth-brand" href="#dashboard"><span class="brand-mark">D</span>devflow</a>
        <div class="auth-copy">
          <span class="eyebrow">SEU TIME, EM FLUXO</span>
          <h1>${registering ? "Comece a construir." : "Bom ter você de volta."}</h1>
          <p>${registering ? "Crie sua conta e organize o próximo grande projeto." : "Entre para acompanhar seus projetos e tarefas."}</p>
        </div>
        <form id="auth-form" class="form-stack">
          ${registering ? `<label>Nome<input name="name" autocomplete="name" minlength="2" maxlength="80" required placeholder="Seu nome"></label>` : ""}
          <label>Email<input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="voce@exemplo.com"></label>
          <label>Senha<input name="password" type="password" autocomplete="${registering ? "new-password" : "current-password"}" minlength="${registering ? "8" : "1"}" maxlength="72" required placeholder="${registering ? "Mínimo de 8 caracteres" : "Sua senha"}"></label>
          <button class="button button-primary button-wide" type="submit">${registering ? "Criar conta" : "Entrar"} <span aria-hidden="true">→</span></button>
        </form>
        <p class="auth-switch">${registering ? "Já tem uma conta?" : "Ainda não tem uma conta?"} <button class="text-button" data-auth-mode="${registering ? "login" : "register"}">${registering ? "Entrar" : "Criar conta"}</button></p>
      </section>
      <aside class="auth-art">
        <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div>
        <div class="art-content">
          <span class="art-spark">✳</span>
          <p>Grandes ideias,<br><strong>entregues em equipe.</strong></p>
          <div class="art-card"><span class="art-check">✓</span><div><strong>Trabalho em movimento</strong><small>Projetos, tarefas e progresso em um só lugar.</small></div><span class="art-avatar">DF</span></div>
        </div>
        <span class="art-footer">CLAREZA PARA FAZER ACONTECER</span>
      </aside>
    </main>`;

  app.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    await runAction(async () => {
      const response = await request(`/auth/${registering ? "register" : "login"}`, {
        method: "POST",
        body,
        token: null
      });
      saveToken(response.token);
      state.user = response.user;
      await renderApp();
    }, registering ? "Conta criada com sucesso!" : "Login realizado com sucesso!");
  });

  app.querySelector("[data-auth-mode]").addEventListener("click", (event) => {
    renderAuth(event.currentTarget.dataset.authMode);
  });
}

function renderShell() {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="#dashboard"><span class="brand-mark">D</span>devflow</a>
        <div class="workspace-label">WORKSPACE</div>
        <nav class="main-nav" aria-label="Navegação principal">
          <button class="nav-link" data-page="dashboard"><span class="nav-icon">◫</span>Visão geral</button>
          <button class="nav-link" data-page="projects"><span class="nav-icon">▤</span>Projetos</button>
          <button class="nav-link" data-page="tasks"><span class="nav-icon">☷</span>Tarefas</button>
        </nav>
        <div class="sidebar-bottom">
          <div class="sidebar-tip"><span class="tip-icon">✦</span><strong>Um passo de cada vez.</strong><p>Pequenas entregas constroem grandes resultados.</p></div>
          <div class="user-profile"><span class="user-avatar">${escapeHtml(initials(state.user?.name))}</span><span class="user-meta"><strong>${escapeHtml(state.user?.name)}</strong><small>${escapeHtml(state.user?.email)}</small></span><button class="icon-button logout-button" aria-label="Sair" title="Sair">↗</button></div>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <button class="icon-button menu-toggle" aria-label="Abrir menu">☰</button>
          <div class="breadcrumb"><span>Workspace</span><span class="crumb-separator">/</span><strong id="page-title">Visão geral</strong></div>
          <div class="topbar-actions"><span class="today-label" id="today-label"></span><span class="topbar-avatar">${escapeHtml(initials(state.user?.name))}</span></div>
        </header>
        <section class="page-content" id="page-content" aria-live="polite"></section>
      </main>
    </div>
    <dialog id="form-dialog" class="form-dialog"></dialog>`;

  app.querySelectorAll("[data-page]").forEach((button) =>
    button.addEventListener("click", () => navigate(button.dataset.page))
  );
  app.querySelector(".logout-button").addEventListener("click", () => signOut(true));
  app.querySelector(".menu-toggle").addEventListener("click", () =>
    app.querySelector("#sidebar").classList.toggle("sidebar-open")
  );
  app.querySelector("#form-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  app.querySelector("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short", day: "numeric", month: "short"
  }).format(new Date());
}

async function renderApp() {
  renderShell();
  await navigate(state.page);
}

async function navigate(page) {
  const requestId = ++state.navigationRequestId;
  state.page = page;
  const titles = { dashboard: "Visão geral", projects: "Projetos", tasks: "Tarefas" };
  app.querySelector("#page-title").textContent = titles[page] || titles.dashboard;
  app.querySelectorAll("[data-page]").forEach((button) =>
    button.classList.toggle("nav-link-active", button.dataset.page === page)
  );
  app.querySelector("#sidebar").classList.remove("sidebar-open");
  const content = app.querySelector("#page-content");
  content.innerHTML = `<div class="page-loading" aria-label="Carregando"><span></span><span></span><span></span></div>`;

  try {
    if (page === "dashboard") {
      const [dashboard, projects] = await Promise.all([request("/dashboard"), request("/projects?limit=5")]);
      if (requestId !== state.navigationRequestId) return;
      state.projects = projects.items;
      renderDashboard(content, { user: state.user, projects: state.projects, dashboard });
      bindDashboard(content);
    } else if (page === "projects") {
      const result = await request(`/projects?limit=100&search=${encodeURIComponent(state.projectSearch)}`);
      if (requestId !== state.navigationRequestId) return;
      state.projects = result.items;
      renderProjects(content, { projects: state.projects, search: state.projectSearch });
      bindProjects(content);
    } else {
      const projectResult = await request("/projects?limit=100");
      if (requestId !== state.navigationRequestId) return;
      state.projects = projectResult.items;
      if (!state.selectedProject || !state.projects.some((project) => project.id === state.selectedProject)) {
        state.selectedProject = state.projects[0]?.id || "";
      }
      if (state.selectedProject) {
        const query = new URLSearchParams({
          limit: "100",
          search: state.taskSearch,
          sort: state.taskSort
        });
        if (state.taskStatus) query.set("status", state.taskStatus);
        const taskResult = await request(`/projects/${state.selectedProject}/tasks?${query}`);
        if (requestId !== state.navigationRequestId) return;
        state.tasks = taskResult.items;
      } else {
        state.tasks = [];
      }
      renderTasks(content, {
        projects: state.projects,
        tasks: state.tasks,
        selectedProject: state.selectedProject,
        search: state.taskSearch,
        status: state.taskStatus,
        sort: state.taskSort
      });
      bindTasks(content);
    }
  } catch (error) {
    if (requestId !== state.navigationRequestId) return;
    if (error.status === 401) {
      await signOut(false);
      return;
    }
    content.innerHTML = `<div class="error-state"><span>!</span><h2>Não foi possível carregar os dados</h2><p>${escapeHtml(error.message)}</p><button class="button button-secondary" data-retry>Tentar novamente</button></div>`;
    content.querySelector("[data-retry]").addEventListener("click", () => navigate(page));
  }
}

function bindDashboard(root) {
  root.querySelectorAll("[data-new-project]").forEach((button) =>
    button.addEventListener("click", () => openProjectDialog())
  );
  root.querySelector('[data-page="projects"]')?.addEventListener("click", () => navigate("projects"));
  root.querySelectorAll("[data-edit-project]").forEach((button) => button.addEventListener("click", () => {
    const project = state.projects.find((item) => item.id === button.dataset.editProject);
    if (project) openProjectDialog(project);
  }));
}

function bindProjects(root) {
  root.querySelectorAll("[data-new-project]").forEach((button) =>
    button.addEventListener("click", () => openProjectDialog())
  );
  root.querySelector("#project-search").addEventListener("input", debounce(async (event) => {
    state.projectSearch = event.target.value;
    const cursor = event.target.selectionStart;
    await navigate("projects");
    const input = app.querySelector("#project-search");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  }, 250));
  root.querySelectorAll("[data-edit-project]").forEach((button) => button.addEventListener("click", () => {
    const project = state.projects.find((item) => item.id === button.dataset.editProject);
    openProjectDialog(project);
  }));
}

function bindTasks(root) {
  root.querySelector("#task-project")?.addEventListener("change", (event) => {
    state.selectedProject = event.target.value;
    navigate("tasks");
  });
  root.querySelector("#task-search")?.addEventListener("input", debounce(async (event) => {
    state.taskSearch = event.target.value;
    const cursor = event.target.selectionStart;
    await navigate("tasks");
    const input = app.querySelector("#task-search");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  }, 250));
  root.querySelector("#task-filter")?.addEventListener("change", (event) => {
    state.taskStatus = event.target.value;
    navigate("tasks");
  });
  root.querySelector("#task-sort")?.addEventListener("change", (event) => {
    state.taskSort = event.target.value;
    navigate("tasks");
  });
  root.querySelectorAll("[data-new-task]").forEach((button) =>
    button.addEventListener("click", () => openTaskDialog())
  );
  root.querySelectorAll("[data-new-project]").forEach((button) =>
    button.addEventListener("click", () => openProjectDialog())
  );
  root.querySelectorAll("[data-task-status]").forEach((select) => select.addEventListener("change", () =>
    runAction(async () => {
      await request(`/tasks/${select.dataset.taskStatus}`, { method: "PUT", body: { status: select.value } });
      await navigate("tasks");
    }, "Status atualizado.")
  ));
  root.querySelectorAll("[data-edit-task]").forEach((button) => button.addEventListener("click", () => {
    const task = state.tasks.find((item) => item.id === button.dataset.editTask);
    openTaskDialog(task);
  }));
}

function openProjectDialog(project) {
  const dialog = app.querySelector("#form-dialog");
  dialog.innerHTML = `
    <form id="project-form" class="dialog-form">
      <div class="dialog-heading"><div><span class="eyebrow">${project ? "CONFIGURAÇÕES" : "NOVO ESPAÇO"}</span><h2>${project ? "Editar projeto" : "Criar projeto"}</h2></div><button type="button" class="icon-button dialog-close" aria-label="Fechar">×</button></div>
      <label>Nome do projeto<input name="name" required minlength="1" maxlength="120" value="${escapeHtml(project?.name || "")}" placeholder="Ex.: Redesign da plataforma"></label>
      <label>Descrição<textarea name="description" maxlength="1000" rows="3" placeholder="O que vocês estão construindo?">${escapeHtml(project?.description || "")}</textarea></label>
      <div class="form-row"><label>Status<select name="status">${optionList(projectStatuses, project?.status || "planejamento")}</select></label><label>Prioridade<select name="priority">${optionList(priorities, project?.priority || "media")}</select></label></div>
      <label>Prazo<input name="dueDate" type="date" value="${escapeHtml(project?.due_date ? String(project.due_date).slice(0, 10) : "")}"></label>
      <div class="dialog-actions">${project ? `<button type="button" class="button button-danger-outline" data-delete-project="${project.id}">Excluir</button>` : `<span></span>`}<button type="submit" class="button button-primary">${project ? "Salvar alterações" : "Criar projeto"}</button></div>
    </form>`;
  dialog.showModal();
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.querySelector("#project-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    if (!body.dueDate) body.dueDate = null;
    await runAction(async () => {
      await request(project ? `/projects/${project.id}` : "/projects", {
        method: project ? "PUT" : "POST", body
      });
      dialog.close();
      await navigate(state.page);
    }, project ? "Projeto atualizado." : "Projeto criado.");
  });
  dialog.querySelector("[data-delete-project]")?.addEventListener("click", () =>
    confirmDelete("Excluir este projeto e todas as tarefas vinculadas?", async () => {
      await request(`/projects/${project.id}`, { method: "DELETE" });
      dialog.close();
      if (state.selectedProject === project.id) state.selectedProject = "";
      await navigate(state.page === "tasks" ? "projects" : state.page);
    })
  );
}

function openTaskDialog(task) {
  const dialog = app.querySelector("#form-dialog");
  dialog.innerHTML = `
    <form id="task-form" class="dialog-form">
      <div class="dialog-heading"><div><span class="eyebrow">${task ? "DETALHES DA TAREFA" : "NOVA ENTREGA"}</span><h2>${task ? "Editar tarefa" : "Criar tarefa"}</h2></div><button type="button" class="icon-button dialog-close" aria-label="Fechar">×</button></div>
      <label>Título<input name="title" required minlength="1" maxlength="160" value="${escapeHtml(task?.title || "")}" placeholder="Ex.: Criar página de login"></label>
      <label>Descrição<textarea name="description" maxlength="1000" rows="3" placeholder="Adicione contexto para a equipe">${escapeHtml(task?.description || "")}</textarea></label>
      <div class="form-row"><label>Status<select name="status">${optionList(taskStatuses, task?.status || "a_fazer")}</select></label><label>Prioridade<select name="priority">${optionList(priorities, task?.priority || "media")}</select></label></div>
      <label>Prazo<input name="dueDate" type="date" value="${escapeHtml(task?.due_date ? String(task.due_date).slice(0, 10) : "")}"></label>
      <div class="dialog-actions">${task ? `<button type="button" class="button button-danger-outline" data-delete-task="${task.id}">Excluir</button>` : `<span></span>`}<button type="submit" class="button button-primary">${task ? "Salvar alterações" : "Criar tarefa"}</button></div>
    </form>`;
  dialog.showModal();
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.querySelector("#task-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!body.dueDate) body.dueDate = null;
    await runAction(async () => {
      await request(task ? `/tasks/${task.id}` : `/projects/${state.selectedProject}/tasks`, {
        method: task ? "PUT" : "POST", body
      });
      dialog.close();
      await navigate("tasks");
    }, task ? "Tarefa atualizada." : "Tarefa criada.");
  });
  dialog.querySelector("[data-delete-task]")?.addEventListener("click", () =>
    confirmDelete("Excluir esta tarefa?", async () => {
      await request(`/tasks/${task.id}`, { method: "DELETE" });
      dialog.close();
      await navigate("tasks");
    })
  );
}

async function confirmDelete(message, action) {
  if (!window.confirm(message)) return;
  await runAction(action, "Item excluído.");
}

async function signOut(callApi) {
  if (callApi && getToken()) {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (error) {
      if (error.status !== 401) showToast(error.message, "error");
    }
  }
  clearToken();
  state.user = null;
  renderAuth();
}

function debounce(callback, delay) {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => callback(...args), delay);
  };
}

async function bootstrap() {
  if (!getToken()) {
    renderAuth();
    return;
  }
  try {
    const result = await request("/auth/me");
    state.user = result.user;
    await renderApp();
  } catch (error) {
    clearToken();
    if (error.status !== 401) showToast(error.message, "error");
    renderAuth();
  }
}

bootstrap();
