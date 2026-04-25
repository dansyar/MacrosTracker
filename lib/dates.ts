// Local-date helpers. We treat dates as YYYY-MM-DD strings to avoid TZ drift.

export function todayISO(): string {
  const d = new Date();
  return toISO(d);
}

export function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function shiftDays(iso: string, delta: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

export function formatHuman(iso: string): string {
  const d = fromISO(iso);
  const today = todayISO();
  const yesterday = shiftDays(today, -1);
  const tomorrow = shiftDays(today, 1);
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  if (iso === tomorrow) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
