import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

/** Nombre qui « compte » jusqu'à sa valeur à l'apparition (respecte reduced-motion). */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const from = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!inView || reduce) {
      el.textContent = format(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = format(v)),
    })
    from.current = value
    return () => controls.stop()
  }, [value, inView, reduce, format])

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : 0)}
    </span>
  )
}
