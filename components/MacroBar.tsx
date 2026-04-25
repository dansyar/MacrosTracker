"use client";

type Props = {
  label: string;
  value: number;
  target: number;
  color?: string;
  unit?: string;
};

export function MacroBar({ label, value, target, color = "#22c55e", unit = "g" }: Props) {
  const pct = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
  const remaining = Math.max(0, target - value);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-fg-muted tabular-nums">
          {Math.round(value)}{unit} <span className="text-fg-dim">/ {target}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {remaining > 0 ? (
        <div className="text-xs text-fg-dim mt-1">{Math.round(remaining)}{unit} remaining</div>
      ) : (
        <div className="text-xs text-accent mt-1">Target hit</div>
      )}
    </div>
  );
}
