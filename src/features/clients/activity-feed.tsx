import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Calculator, Mail, MessageSquareText, Phone, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Activity } from '@/lib/types'
import { formatRelativeTime } from '@/lib/format'
import { spring } from '@/lib/motion'
import { MOD } from '@/lib/platform'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { StageBadge } from '@/components/app/stage-badge'
import { useActivities, useAddNote } from './api'

const ICONS: Record<string, typeof MessageSquareText> = {
  note: MessageSquareText,
  stage: ArrowRight,
  email: Mail,
  appel: Phone,
  simulation: Calculator,
}

export function ActivityFeed({ clientId }: { clientId: string }) {
  const { data, isLoading } = useActivities(clientId)
  const add = useAddNote()
  const [body, setBody] = useState('')

  function submit() {
    if (!body.trim()) return
    add.mutate(
      { clientId, body: body.trim() },
      {
        onSuccess: () => {
          setBody('')
          toast.success('Note ajoutée au journal')
        },
        onError: (e) => toast.error("Impossible d'ajouter la note", { description: e.message }),
      },
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
          placeholder={`Ajouter une note au journal… (${MOD}+↵)`}
          className="min-h-14 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} loading={add.isPending} disabled={!body.trim()}>
            Ajouter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex-1 space-y-1.5 pt-1">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState compact icon={Sparkles} title="Journal vierge" description="Les changements d'étape, emails et notes s'afficheront ici." />
      ) : (
        <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-px before:bg-border">
          <AnimatePresence initial={false}>
            {data.map((a) => (
              <motion.li key={a.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth} className="relative flex gap-3 py-1.5">
                <ActivityIcon type={a.type} />
                <div className="min-w-0 flex-1 pt-1">
                  <ActivityBody activity={a} />
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeTime(a.created_at)}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const Icon = ICONS[type] ?? Sparkles
  return (
    <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs">
      <Icon className="size-3.5" />
    </span>
  )
}

function ActivityBody({ activity: a }: { activity: Activity }) {
  if (a.type === 'stage') {
    const from = typeof a.meta.from === 'string' ? a.meta.from : null
    const to = typeof a.meta.to === 'string' ? a.meta.to : null
    return (
      <p className="flex flex-wrap items-center gap-1.5 text-[13px]">
        <span className="text-muted-foreground">Étape</span>
        {from && <StageBadge stage={from} short />}
        <ArrowRight className="size-3 text-muted-foreground" />
        {to && <StageBadge stage={to} short />}
      </p>
    )
  }
  const label: Record<string, string> = { email: 'Email', appel: 'Appel', simulation: 'Simulation', note: 'Note' }
  return (
    <div className="text-[13px]">
      {a.type !== 'note' && <span className="mr-1.5 font-medium">{label[a.type] ?? a.type}</span>}
      {a.body ? <span className="leading-relaxed whitespace-pre-wrap text-foreground/90">{a.body}</span> : <span className="text-muted-foreground">—</span>}
    </div>
  )
}
