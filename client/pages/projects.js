import { escapeHtml } from "../utils/format.js";
import { renderProjectCard } from "./dashboard.js";

export function renderProjects(root, { projects, search }) {
  const cards = projects.map(renderProjectCard).join("");
  root.innerHTML = `
    <div class="welcome-row page-heading"><div><span class="eyebrow">MANTENHA O FOCO</span><h1>Seus projetos</h1><p>Acompanhe o progresso de tudo o que seu time está construindo.</p></div><button class="button button-primary" data-new-project><span>＋</span> Novo projeto</button></div>
    <section class="panel list-panel"><div class="list-toolbar"><label class="search-box"><span>⌕</span><input id="project-search" type="search" placeholder="Buscar projetos..." value="${escapeHtml(search)}"></label><span class="result-count">${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}</span></div>
      ${cards ? `<div class="project-grid all-projects">${cards}</div>` : `<div class="empty-state"><span class="empty-illustration">▤</span><h3>Nenhum projeto encontrado</h3><p>${search ? "Tente buscar por outro termo." : "Crie seu primeiro projeto para começar."}</p><button class="button button-primary" data-new-project>Criar projeto</button></div>`}
    </section>`;
}
