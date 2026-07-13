// Lightweight haptic feedback for the snake game, using the Vibration API.
// No-ops on devices without vibration support (desktop, iOS Safari). Enabled by
// default where supported; the preference persists in localStorage.

const KEY = "snakeHaptics";

export function hapticsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function hapticsEnabled(): boolean {
  if (!hapticsSupported()) return false;
  try {
    return window.localStorage.getItem(KEY) !== "off"; // default on
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable — preference just won't persist */
  }
}

type Kind = "turn" | "eat" | "over";

// Short, distinct patterns (ms). A turn is a light tick; eating is a firmer
// bump; game over is a triple buzz.
const PATTERNS: Record<Kind, number | number[]> = {
  turn: 8,
  eat: 25,
  over: [60, 40, 60],
};

export function haptic(kind: Kind): void {
  if (!hapticsEnabled()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* ignore */
  }
}
