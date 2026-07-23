export type NeonSnakeGestureControl = "left" | "right" | "boost";

export function neonSnakeControlForSwipe(
  deltaX: number,
  deltaY: number,
  threshold = 28,
): NeonSnakeGestureControl | null {
  if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return null;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX < 0 ? "left" : "right";
  return deltaY < -threshold ? "boost" : null;
}
