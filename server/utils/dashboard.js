export function completionPercent(completed, total) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}
