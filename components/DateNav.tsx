"use client";

import { formatHuman, shiftDays, todayISO } from "@/lib/dates";

type Props = {
  date: string;
  onChange: (next: string) => void;
};

export function DateNav({ date, onChange }: Props) {
  const isToday = date === todayISO();
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        aria-label="Previous day"
        className="btn-ghost text-xl px-3 -ml-2"
        onClick={() => onChange(shiftDays(date, -1))}
      >
        ‹
      </button>
      <button
        className="text-center flex-1 py-1 rounded-lg hover:bg-bg-elevated transition"
        onClick={() => onChange(todayISO())}
        title="Jump to today"
      >
        <div className="text-base font-semibold">{formatHuman(date)}</div>
        <div className="text-xs text-fg-muted">{date}</div>
      </button>
      <button
        aria-label="Next day"
        className="btn-ghost text-xl px-3 -mr-2 disabled:opacity-30"
        onClick={() => onChange(shiftDays(date, 1))}
        disabled={isToday}
      >
        ›
      </button>
    </div>
  );
}
