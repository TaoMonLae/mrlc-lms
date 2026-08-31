import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type AnimatedContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  container?: HTMLElement | string | null;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
};

// React Bits Animated Content, adapted for TypeScript and MRLC's accessibility
// baseline. Its documented GSAP distance/axis/threshold behavior is retained;
// reduced-motion users receive the final state without spatial movement.
export default function AnimatedContent({
  children,
  container,
  distance = 40,
  direction = 'vertical',
  reverse = false,
  duration = 0.7,
  ease = 'power3.out',
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.12,
  delay = 0,
  className = '',
  style,
  ...props
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(element, { clearProps: 'all', visibility: 'visible', opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    let scroller: HTMLElement | null = null;
    if (typeof container === 'string') scroller = document.querySelector<HTMLElement>(container);
    else if (container instanceof HTMLElement) scroller = container;

    const axis = direction === 'horizontal' ? 'x' : 'y';
    const offset = reverse ? -distance : distance;
    const startPercent = (1 - threshold) * 100;

    gsap.set(element, {
      [axis]: offset,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
      visibility: 'visible',
    });

    const timeline = gsap.timeline({ paused: true, delay });
    timeline.to(element, { [axis]: 0, scale: 1, opacity: 1, duration, ease });

    const trigger = ScrollTrigger.create({
      trigger: element,
      scroller: scroller || undefined,
      start: `top ${startPercent}%`,
      once: true,
      onEnter: () => timeline.play(),
    });

    return () => {
      trigger.kill();
      timeline.kill();
    };
  }, [animateOpacity, container, delay, direction, distance, duration, ease, initialOpacity, reverse, scale, threshold]);

  return (
    <div ref={ref} className={className} style={{ ...style, visibility: 'hidden' }} {...props}>
      {children}
    </div>
  );
}
