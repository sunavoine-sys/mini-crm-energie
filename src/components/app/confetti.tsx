import { createPortal } from 'react-dom'
import { motion } from 'motion/react'

const COLORS = ['var(--stage-signe)', 'var(--primary)', 'var(--stage-offre)', 'var(--stage-acd)', 'var(--stage-factures)']

/** Petite gerbe de confettis (20 particules, 900 ms) à une position écran. */
export function ConfettiBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const pieces = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.2
    const dist = 60 + ((i * 37) % 70)
    return { i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 40, rot: (i * 47) % 360, color: COLORS[i % COLORS.length], w: i % 2 ? 6 : 4, h: i % 2 ? 3 : 7 }
  })
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="absolute rounded-[1px]"
          style={{ left: x, top: y, width: p.w, height: p.h, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.dx, y: [0, p.dy, p.dy + 90], opacity: [1, 1, 0], rotate: p.rot + 180, scale: 1 }}
          transition={{ duration: 0.95, ease: [0.2, 0.8, 0.4, 1], times: [0, 0.45, 1] }}
          onAnimationComplete={p.i === 0 ? onDone : undefined}
        />
      ))}
    </div>,
    document.body,
  )
}
