/** Короткий час для шапки поста (як у стрічці). */
export function formatPostTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "щойно";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} хв`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} год`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} д`;
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
