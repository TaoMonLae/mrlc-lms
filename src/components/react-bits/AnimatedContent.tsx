// Adapted from React Bits AnimatedContent (MIT + Commons Clause; see LICENSE.md):
// https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Animations/AnimatedContent/AnimatedContent.tsx
// Product adaptation: short entrance, reduced motion, no initially hidden content.
import { useEffect, useRef, type HTMLAttributes } from 'react';
import { gsap } from 'gsap';
export default function AnimatedContent({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => gsap.fromTo(ref.current, { y: 6, opacity: 0.7 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out', clearProps: 'transform,opacity' }), ref);
    return () => context.revert();
  }, []);
  return <div ref={ref} {...props}>{children}</div>;
}
