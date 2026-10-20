const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

export function formatDate(value) {
  if (!value) return "Sem prazo";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return dateFormatter.format(date);
}

export function labelFor(value) {
  return ({
    planejamento: "Planejamento",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    arquivado: "Arquivado",
    a_fazer: "A fazer",
    em_revisao: "Em revisão",
    concluida: "Concluída",
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente"
  })[value] || value;
}

export function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
