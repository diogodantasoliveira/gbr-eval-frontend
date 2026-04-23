const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function timeAgo(ts: number | Date): string {
  const now = Date.now();
  const then = typeof ts === "number" ? ts : ts.getTime();
  const diff = now - then;

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m}m ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h}h ago`;
  }
  if (diff < 7 * DAY) {
    const d = Math.floor(diff / DAY);
    return `${d}d ago`;
  }
  return formatDate(then);
}

export function formatDate(ts: number | Date): string {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ts: number | Date): string {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(ts: number | Date): string {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
