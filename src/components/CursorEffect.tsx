import { Suspense, useEffect, useState } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import { useAuth } from '../providers/AuthProvider';
import { lazyWithRetry as lazy } from '../lib/lazyWithRetry';
import { CURSOR_PREVIEW_EVENT, isCursorEffect, resolveCursorEffect } from '../lib/cursorEffects';
import type { CursorEffect as CursorEffectName } from '../types/settings';

const BlobCursor = lazy(() => import('@/components/BlobCursor'));
const SplashCursor = lazy(() => import('@/components/SplashCursor'));
const Ribbons = lazy(() => import('@/components/Ribbons'));
const GhostCursor = lazy(() => import('@/components/GhostCursor'));
const ClickSpark = lazy(() => import('@/components/ClickSpark'));
const TargetCursor = lazy(() => import('@/components/TargetCursor'));

// Dispatches whichever cursor/mouse effect applies for the current user:
// their own personal pick from My Profile if they've set one, otherwise the
// school-wide default from Settings -> System -> Cursor Effects. Purely
// decorative — never blocks clicks (each branch is either self-contained
// pointer-events-none, or wrapped in one here), and is skipped entirely for
// prefers-reduced-motion.
export default function CursorEffect() {
  const { systemSettings } = useSettings();
  const { user } = useAuth();
  const [previewEffect, setPreviewEffect] = useState<CursorEffectName | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const onPreview = (event: Event) => {
      const value = (event as CustomEvent<CursorEffectName | null>).detail;
      setPreviewEffect(isCursorEffect(value) ? value : null);
    };
    window.addEventListener(CURSOR_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(CURSOR_PREVIEW_EVENT, onPreview);
  }, []);

  if (reducedMotion) return null;

  const effect = previewEffect ?? resolveCursorEffect(user?.cursorEffect, systemSettings.cursorEffect);

  let visual: React.ReactNode;
  switch (effect) {
    case 'SPLASH_CURSOR':
      // Keep the published fluid simulation while using its documented
      // resolution control at a safe full-app cost.
      visual = <SplashCursor SIM_RESOLUTION={64} DYE_RESOLUTION={256} CAPTURE_RESOLUTION={256} SHADING={false} />;
      break;
    case 'RIBBONS':
      visual = (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
          <Ribbons />
        </div>
      );
      break;
    case 'GHOST_CURSOR':
      // Wrapped with an inline (not Tailwind-class) `position: fixed` so the
      // component's own "was my parent static?" check sees a non-static
      // inline style and doesn't override it — see GhostCursor.jsx.
      visual = (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none', overflow: 'hidden' }}>
          <GhostCursor />
        </div>
      );
      break;
    case 'CLICK_SPARK':
      // React Bits' published defaults: 8 rays, 10px length, 15px radius,
      // 400ms ease-out. Only the color is tuned to MRLC's brand palette.
      visual = <ClickSpark sparkColor="#168c83" />;
      break;
    case 'TARGET_CURSOR':
      visual = (
        <TargetCursor
          cursorColor="#168c83"
          targetSelector="a, button, input, select, textarea, summary, [role='button'], [role='link'], [role='tab']"
        />
      );
      break;
    case 'NONE':
      return null;
    case 'RAINBOW_TRAIL':
    default:
      // Preserve the stored legacy enum while rendering the official React
      // Bits effect represented by this setting.
      visual = <BlobCursor />;
  }

  return <Suspense fallback={null}>{visual}</Suspense>;
}
