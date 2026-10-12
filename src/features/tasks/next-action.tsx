import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, Check, Clock, History, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '@/lib/types'
import { daysFromToday, formatDay, formatRelativeDay, todayISO } from '@/lib/format'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { TASK_TYPES, taskTypeLabel, useClientTasks, useCreateTask, useDeleteTask, useToggleTask } from './api'

function addDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const QUICK_DATES = [
  { label: 'Demain', days: 1 },
  { label: '+3 j', days: 3 },
  { label: '+1 sem.', days: 7 },
  { label: '+1 mois', days: 30 },
]

function dueTone(day: string) {
  const d = daysFromToday(day)
  if (d < 0) return 'text-destructive'
  if (d === 0) return 'text-stage-offre'
  return 'text-muted-foreground'
}

export function NextAction({ clientId }: { clientId: string }) {
  const { data: tasks, isLoading } = useClientTasks(clientId)
  const toggle = useToggleTask()
  const remove = useDeleteTask()
  const [planning, setPlanning] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const open = tasks?.find((t) => !t.done_at)
  const history = (tasks ?? []).filter((t) => t.done_at)

  function complete(t: Task) {
    toggle.mutate(t, {
      onSuccess: (done) =>
        toast.success(done ? 'Action terminée ✓' : 'Action réouverte', {
          description: t.title,
          action: done ? { label: 'Planifier la suite', onClick: () => setPlanning(true) } : undefined,
        }),
      onError: (e) => toast.error('Mise à jour impossible', { description: e.message }),
    })
  }

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card shadow-xs">
      <header className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <h3 className="text-sm font-semibold tracking-tight">Prochaine action</h3>
        {!planning && (
          <Button size="xs" variant="ghost" className="text-foreground" onClick={() => setPlanning(true)}>
            <CalendarPlus /> Planifier
          </Button>
        )}
      </header>

      <div className="flex-1 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {planning ? (
              <motion.div key="form" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={spring.smooth}>
                <TaskForm clientId={clientId} replaces={open} onDone={() => setPlanning(false)} />
              </motion.div>
            ) : open ? (
              <motion.div key={open.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={spring.smooth} className="flex items-start gap-3">
                <button
                  onClick={() => complete(open)}
                  aria-label="Marquer comme terminée"
                  className="group/check mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/40 transition-colors hover:border-stage-signe hover:bg-stage-signe/10 active:scale-90"
                >
                  <Check className="size-3 text-stage-signe opacity-0 transition-opacity group-hover/check:opacity-100" strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-medium">{open.title}</p>
                  <p className={cn('mt-1 flex items-center gap-1.5 text-xs', dueTone(open.due_date))}>
                    <Clock className="size-3" />
                    <span className="first-letter:uppercase">{formatRelativeDay(open.due_date)}</span>
                    <span className="text-muted-foreground">
                      · {formatDay(open.due_date, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {open.due_time ? ` à ${open.due_time.slice(0, 5)}` : ''} · {taskTypeLabel(open.type)}
                    </span>
                  </p>
                  {open.notes && <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{open.notes}</p>}
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPlanning(true)}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-3 py-3 text-left text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <CalendarPlus className="size-4" />
                Aucune action prévue — planifie la prochaine étape.
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>

      {history.length > 0 && (
        <div className="border-t border-border">
          <button onClick={() => setShowHistory((v) => !v)} className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <History className="size-3.5" />
            Historique · {history.length}
          </button>
          <AnimatePresence initial={false}>
            {showHistory && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring.smooth} className="overflow-hidden">
                {history.slice(0, 8).map((t) => (
                  <li key={t.id} className="group flex items-center gap-2 px-4 py-1.5 text-xs">
                    <Check className="size-3 shrink-0 text-stage-signe" />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground line-through decoration-muted-foreground/40">{t.title}</span>
                    <span className="tabular shrink-0 text-[11px] text-muted-foreground">{formatDay(t.due_date, { day: 'numeric', month: 'short' })}</span>
                    <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button size="icon-xs" variant="ghost" className="size-6" aria-label="Réouvrir" onClick={() => complete(t)}>
                        <RotateCcw className="size-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="destructive-ghost"
                        className="size-6"
                        aria-label="Supprimer"
                        onClick={() => remove.mutate(t.id, { onError: (e) => toast.error('Suppression impossible', { description: e.message }) })}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </span>
                  </li>
                ))}
                <li className="h-2" />
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

function TaskForm({ clientId, replaces, onDone }: { clientId: string; replaces?: Task; onDone: () => void }) {
  const create = useCreateTask()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>('relance')
  const [date, setDate] = useState(addDays(1))
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    create.mutate(
      { client_id: clientId, title: title.trim(), type, due_date: date, due_time: time || null, notes: notes.trim() || null },
      {
        onSuccess: () => {
          toast.success('Action planifiée', { description: `${title.trim()} · ${formatRelativeDay(date)}` })
          onDone()
        },
        onError: (err) => toast.error('Impossible de planifier', { description: err.message }),
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3" onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onDone())}>
      <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Relancer pour les factures" aria-label="Intitulé de l'action" />
      <div className="grid grid-cols-2 gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Heure" />
      </div>
      <Field label="Échéance">
        <Input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} required />
        <div className="flex flex-wrap gap-1">
          {QUICK_DATES.map((q) => {
            const value = addDays(q.days)
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => setDate(value)}
                className={cn('h-6 rounded-md px-2 text-[11px] font-medium transition-colors', date === value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                {q.label}
              </button>
            )
          })}
        </div>
      </Field>
      <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Détail (optionnel)" className="min-h-14" />
      {replaces && <p className="text-[11px] text-muted-foreground">Remplacera l'action en cours « {replaces.title} ».</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={create.isPending} disabled={!title.trim()}>
          Planifier
        </Button>
      </div>
    </form>
  )
}
