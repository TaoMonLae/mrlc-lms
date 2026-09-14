import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

/**
 * A restrained, app-specific adaptation of React Bits Pro's Staggered Text.
 * It keeps the heading semantic and becomes static for reduced-motion users.
 */
export function LibraryStaggeredText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const words = text.trim().split(/\s+/);

  return (
    <motion.h1
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      transition={{ staggerChildren: reduceMotion ? 0 : 0.045, delayChildren: reduceMotion ? 0 : 0.08 }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={reduceMotion ? undefined : wordVariants}
          transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {word}{index < words.length - 1 ? '\u00a0' : ''}
        </motion.span>
      ))}
    </motion.h1>
  );
}

/** React Bits-style reveal used only for high-level catalog sections. */
export function LibraryReveal({
  children,
  className,
  delay = 0,
  ...props
}: Omit<ComponentProps<typeof motion.div>, 'children'> & {
  children: ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      {...props}
      className={cn(className)}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
