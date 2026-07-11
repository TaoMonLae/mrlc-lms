import * as React from "react";
import { useCallback, useRef } from "react";
import { haptic } from "./haptics";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

/**
 * Touch swipe-to-steer for the snake board. Returns handlers to spread onto the
 * canvas (or its wrapper). Swiping in a direction turns the snake; the start
 * point resets after each recognized swipe so the player can keep steering with
 * one continuous thumb drag without lifting.
 *
 * Pair with `touch-none` on the element so the gesture doesn't scroll/zoom the
 * page.
 */
export function useSwipeControls(onSwipe: (dir: Direction) => void, enabled = true) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      if (t) start.current = { x: t.clientX, y: t.clientY };
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !start.current) return;
      const t = e.touches[0];
      if (!t) return;

      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;

      // Require a deliberate flick before turning, so a tiny wobble doesn't fire.
      const threshold = 20;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        onSwipe(dx > 0 ? "RIGHT" : "LEFT");
      } else {
        onSwipe(dy > 0 ? "DOWN" : "UP");
      }
      haptic("turn");

      // Reset so a continuous drag can chain multiple turns.
      start.current = { x: t.clientX, y: t.clientY };
      if (e.cancelable) e.preventDefault();
    },
    [enabled, onSwipe]
  );

  const onTouchEnd = useCallback(() => {
    start.current = null;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
