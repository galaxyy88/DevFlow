export function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));

  return { page, limit, offset: (page - 1) * limit };
}

export function createUpdateClause(fields, columnNames) {
  const entries = Object.entries(fields);

  if (entries.length === 0) {
    return null;
  }

  const assignments = entries.map(([field], index) => `${columnNames[field]} = $${index + 1}`);
  return {
    assignments: assignments.join(", "),
    values: entries.map(([, value]) => value)
  };
}
