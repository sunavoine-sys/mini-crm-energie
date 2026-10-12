import { cn } from '@/lib/utils'

/** Squelette « shimmer » : reflet qui balaie la forme du contenu final. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_0%,color-mix(in_oklch,var(--muted),var(--foreground)_6%)_50%,var(--muted)_100%)] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
