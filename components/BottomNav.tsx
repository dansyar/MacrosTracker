"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/", label: "Home", icon: <HomeIcon /> },
  { href: "/log-food", label: "Log", icon: <PlusIcon /> },
  { href: "/history", label: "History", icon: <ChartIcon /> },
  { href: "/profile", label: "Profile", icon: <UserIcon /> },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-bg-elevated/95 backdrop-blur safe-bottom">
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname?.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 ${
                  active ? "text-accent" : "text-fg-muted hover:text-fg"
                }`}
              >
                <span className="h-6 w-6">{it.icon}</span>
                <span className="text-[11px] font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16" />
      <path d="M6 16V9M11 16V5M16 16v-7M21 16v-3" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
