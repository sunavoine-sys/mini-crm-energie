import type { LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

/** État vide illustré : icône sur halo + grille estompée, texte clair, CTA. */
function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-8' : 'gap-3 py-14', className)}
    >
      <div className="relative mb-1">
        <div
          aria-hidden
          className="absolute -inset-8 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:radial-gradient(circle,black,transparent_70%)]"
        />
        <div className={cn('relative flex items-center justify-center rounded-xl border border-border bg-card shadow-md', compact ? 'size-10' : 'size-12')}>
          <Icon className={cn('text-muted-foreground', compact ? 'size-4.5' : 'size-5')} strokeWidth={1.75} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  )
}

export { EmptyState }
