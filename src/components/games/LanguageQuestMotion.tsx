import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type QuestStaggeredTextProps = {
  text: string;
  as?: 'h1' | 'h2' | 'p';
  className?: string;
  delay?: number;
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

/**
 * A small, app-specific adaptation of React Bits Pro's staggered text pattern.
 * It keeps the source copy semantic, animates by word, and becomes static when
 * the learner asks the operating system to reduce motion.
 */
export function QuestStaggeredText({
  text,
  as = 'h1',
  className,
  delay = 0.04,
}: QuestStaggeredTextProps) {
  const reduceMotion = useReducedMotion();
  const words = text.trim().split(/\s+/);
  const Tag = as === 'h2' ? motion.h2 : as === 'p' ? motion.p : motion.h1;

  return (
    <Tag
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      transition={{ staggerChildren: reduceMotion ? 0 : delay, delayChildren: reduceMotion ? 0 : 0.08 }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={reduceMotion ? undefined : wordVariants}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {word}{index < words.length - 1 ? '\u00a0' : ''}
        </motion.span>
      ))}
    </Tag>
  );
}

type QuestDepthStageProps = {
  children: ReactNode;
  className?: string;
};

/** Pointer depth inspired by React Bits Pro's Depth Card, restrained for UI. */
export function QuestDepthStage({ children, className }: QuestDepthStageProps) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 190, damping: 24, mass: 0.45 });
  const smoothY = useSpring(pointerY, { stiffness: 190, damping: 24, mass: 0.45 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [3.5, -3.5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-5, 5]);
  const spotlightX = useTransform(smoothX, [-0.5, 0.5], ['35%', '65%']);
  const spotlightY = useTransform(smoothY, [-0.5, 0.5], ['30%', '70%']);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const reset = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div className={cn('lq-depth-stage', className)} onPointerMove={handlePointerMove} onPointerLeave={reset}>
      <motion.div
        className="lq-depth-stage__surface"
        style={reduceMotion ? undefined : { rotateX, rotateY }}
      >
        <motion.span
          aria-hidden="true"
          className="lq-depth-stage__spotlight"
          style={reduceMotion ? undefined : { left: spotlightX, top: spotlightY }}
        />
        {children}
      </motion.div>
    </div>
  );
}

export function QuestReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
