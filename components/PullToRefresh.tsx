"use client";

import { useRef, useState } from "react";

const TRIGGER = 60;
const MAX = 90;

type Props = {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
};

export function PullToRefresh({ onRefresh, children }: Props) {
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const animating = useRef(true);

  function handleTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    if ((window.scrollY || document.documentElement.scrollTop) > 0) return;
    startY.current = e.touches[0].clientY;
    animating.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      setOffset(0);
      return;
    }
    // sqrt resistance — gives a satisfying "rubber band" feel
    setOffset(Math.min(MAX, Math.sqrt(dy * 6)));
  }

  async function handleTouchEnd() {
    if (startY.current === null) return;
    const triggered = offset >= TRIGGER;
    startY.current = null;
    animating.current = true;
    if (triggered) {
      setRefreshing(true);
      setOffset(TRIGGER);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
  }

  const indicator =
    refreshing ? "Refreshing…" : offset >= TRIGGER ? "Release to refresh" : offset > 0 ? "Pull to refresh" : "";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center text-fg-muted text-xs overflow-hidden"
        style={{
          height: offset,
          transition: animating.current ? "height 220ms ease" : "none",
        }}
      >
        <span className={refreshing ? "animate-pulse" : undefined}>{indicator}</span>
      </div>
      {children}
    </div>
  );
}
