import { useEffect, useState } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import { useAuth } from '../providers/AuthProvider';
import RainbowMouseTrail from './RainbowMouseTrail';
import SplashCursor from '@/components/SplashCursor';
import Ribbons from '@/components/Ribbons';
import GhostCursor from '@/components/GhostCursor';
import ClickSpark from '@/components/ClickSpark';
import TargetCursor from '@/components/TargetCursor';

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

  switch (effect) {
    case 'SPLASH_CURSOR':
      return <SplashCursor />;
    case 'RIBBONS':
      return (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
          <Ribbons colors={['#7a3dff', '#3b89ff', '#ff6ec7']} />
        </div>
      );
    case 'GHOST_CURSOR':
      // Wrapped with an inline (not Tailwind-class) `position: fixed` so the
      // component's own "was my parent static?" check sees a non-static
      // inline style and doesn't override it — see GhostCursor.jsx.
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none', overflow: 'hidden' }}>
          <GhostCursor />
        </div>
      );
    case 'CLICK_SPARK':
      return <ClickSpark sparkColor="#7a3dff" />;
    case 'TARGET_CURSOR':
      // Corners only "lock on" to elements with a .cursor-target class;
      // without any on the page yet it's still a fully functional custom
      // spinning-reticle cursor on its own.
      return <TargetCursor cursorColor="#7a3dff" />;
    case 'NONE':
      return null;
    case 'RAINBOW_TRAIL':
    default:
      return <RainbowMouseTrail />;
  }
}
