import { lazy, Suspense, useEffect, useState } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import { useAuth } from '../providers/AuthProvider';

const RainbowMouseTrail = lazy(() => import('./RainbowMouseTrail'));
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
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (reducedMotion) return null;

  const effect = user?.cursorEffect || systemSettings.cursorEffect;

  let visual: React.ReactNode;
  switch (effect) {
    case 'SPLASH_CURSOR':
      visual = <SplashCursor />;
      break;
    case 'RIBBONS':
      visual = (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
          <Ribbons colors={['#7a3dff', '#3b89ff', '#ff6ec7']} />
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
      visual = <ClickSpark sparkColor="#7a3dff" />;
      break;
    case 'TARGET_CURSOR':
      // Corners only "lock on" to elements with a .cursor-target class;
      // without any on the page yet it's still a fully functional custom
      // spinning-reticle cursor on its own.
      visual = <TargetCursor cursorColor="#7a3dff" />;
      break;
    case 'NONE':
      return null;
    case 'RAINBOW_TRAIL':
    default:
      visual = <RainbowMouseTrail />;
  }

  return <Suspense fallback={null}>{visual}</Suspense>;
}
