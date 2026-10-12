import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

/** Avatar à initiales, teinte stable dérivée du nom. */
function Avatar({ name, className }: { name: string | null | undefined; className?: string }) {
  const hue = [...(name ?? '?')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)
  return (
    <span
      aria-hidden
      className={cn('inline-flex size-8 shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10', className)}
      style={{
        background: `oklch(0.92 0.04 ${hue})`,
        color: `oklch(0.38 0.08 ${hue})`,
      }}
    >
      {initials(name)}
    </span>
  )
}

export { Avatar }
