import type { CursorEffect } from '../types/settings';

export const CURSOR_EFFECTS: CursorEffect[] = [
  'NONE',
  'RAINBOW_TRAIL',
  'SPLASH_CURSOR',
  'RIBBONS',
  'GHOST_CURSOR',
  'CLICK_SPARK',
  'TARGET_CURSOR',
];

export const CURSOR_EFFECT_LABELS: Record<CursorEffect, string> = {
  NONE: 'None',
  RAINBOW_TRAIL: 'Blob Cursor',
  SPLASH_CURSOR: 'Splash Cursor (fluid)',
  RIBBONS: 'Ribbons',
  GHOST_CURSOR: 'Ghost Cursor (smoke trail)',
  CLICK_SPARK: 'Click Spark',
  TARGET_CURSOR: 'Target Cursor (reticle)',
};

export const CURSOR_PREVIEW_EVENT = 'mrlc:cursor-effect-preview';

export function isCursorEffect(value: unknown): value is CursorEffect {
  return typeof value === 'string' && CURSOR_EFFECTS.includes(value as CursorEffect);
}

export function resolveCursorEffect(personal: unknown, schoolDefault: unknown): CursorEffect {
  if (isCursorEffect(personal)) return personal;
  if (isCursorEffect(schoolDefault)) return schoolDefault;
  return 'CLICK_SPARK';
}

// System Settings submits the cursor field only when that control changed.
// This matters because the server uses its presence to make the saving admin
// follow the newly selected school default; unrelated settings saves must not
// silently clear an existing personal preference.
export function cursorEffectForSchoolSave(effect: unknown, changed: boolean): CursorEffect | undefined {
  return changed && isCursorEffect(effect) ? effect : undefined;
}

export function previewCursorEffect(effect: CursorEffect | null) {
  window.dispatchEvent(new CustomEvent<CursorEffect | null>(CURSOR_PREVIEW_EVENT, { detail: effect }));
}
