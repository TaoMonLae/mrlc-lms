import { useEffect, useState } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import RainbowMouseTrail from './RainbowMouseTrail';
import SplashCursor from '@/components/SplashCursor';
import Ribbons from '@/components/Ribbons';

// Dispatches whichever global cursor/mouse effect is picked in
// Settings -> System -> Cursor Effects. Purely decorative — never blocks
// clicks (each branch is either self-contained pointer-events-none, or
// wrapped in one here), and is skipped entirely for prefers-reduced-motion.
export default function CursorEffect() {
  const { systemSettings } = useSettings();
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

  switch (systemSettings.cursorEffect) {
    case 'SPLASH_CURSOR':
      return <SplashCursor />;
    case 'RIBBONS':
      return (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
          <Ribbons colors={['#7a3dff', '#3b89ff', '#ff6ec7']} />
        </div>
      );
    case 'NONE':
      return null;
    case 'RAINBOW_TRAIL':
    default:
      return <RainbowMouseTrail />;
  }
}
