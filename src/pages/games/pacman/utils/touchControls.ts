import { Direction } from "../types";

export function pacmanDirectionForSwipe(
  deltaX: number,
  deltaY: number,
  minimumDistance = 24,
): Direction | null {
  if (Math.hypot(deltaX, deltaY) < minimumDistance) return null;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? "RIGHT" : "LEFT";
  }
  return deltaY > 0 ? "DOWN" : "UP";
}
