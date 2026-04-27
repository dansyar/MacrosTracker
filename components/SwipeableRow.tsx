"use client";

import { useRef, useState } from "react";

const REVEAL_WIDTH = 96;
const TRIGGER_PX = 32;
const VERTICAL_CANCEL_PX = 12;

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
};

// Mobile: drag the row left to reveal a Delete button. Tap reveals a delete confirmation.
// Falls back to a desktop-friendly Delete button at the right edge on non-touch interaction.
export function SwipeableRow({ children, onDelete, className = "" }: Props) {
  const [tx, setTx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startTx = useRef(0);
  const swiping = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTx.current = tx;
    swiping.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!swiping.current) {
      // Cancel horizontal swipe if the user is clearly scrolling vertically
      if (Math.abs(dy) > VERTICAL_CANCEL_PX && Math.abs(dy) > Math.abs(dx)) {
        startX.current = null;
        startY.current = null;
        return;
      }
      if (Math.abs(dx) > 6) swiping.current = true;
    }
    if (!swiping.current) return;
    const next = Math.min(0, Math.max(-REVEAL_WIDTH, startTx.current + dx));
    setTx(next);
  }

  function onTouchEnd() {
    if (startX.current === null) return;
    startX.current = null;
    startY.current = null;
    if (tx <= -REVEAL_WIDTH + TRIGGER_PX) {
      setTx(-REVEAL_WIDTH);
    } else {
      setTx(0);
    }
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={onDelete}
        className="absolute inset-y-0 right-0 bg-danger text-white font-semibold text-sm flex items-center justify-center"
        style={{ width: REVEAL_WIDTH }}
        tabIndex={tx === 0 ? -1 : 0}
        aria-hidden={tx === 0}
      >
        Delete
      </button>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="bg-bg-card relative"
        style={{
          transform: `translateX(${tx}px)`,
          transition: swiping.current ? "none" : "transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
