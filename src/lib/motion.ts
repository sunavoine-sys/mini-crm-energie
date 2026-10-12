import type { Transition, Variants } from 'motion/react'

/** Ressorts partagés : même sensation physique dans toute l'app. */
export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } satisfies Transition,
  smooth: { type: 'spring', stiffness: 300, damping: 32 } satisfies Transition,
  gentle: { type: 'spring', stiffness: 180, damping: 26 } satisfies Transition,
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: spring.smooth },
}

export const stagger = (step = 0.035, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
})
