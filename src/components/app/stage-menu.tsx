import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { STAGES, stageOf } from '@/lib/stages'
import type { Client, StageId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUpdateStage } from '@/features/clients/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const CELEBRATION: Partial<Record<StageId, string>> = {
  signe: 'Contrat signé ! 🎉',
  acd: 'ACD signé — on passe à la cotation ✍️',
  offre: 'Offre placée 🚀',
}

export function StageMenu({ client }: { client: Client }) {
  const update = useUpdateStage()
  const current = stageOf(client.stage)

  function change(value: string) {
    const stage = value as StageId
    if (stage === client.stage) return
    const label = client.company ?? 'Dossier'
    update.mutate(
      { id: client.id, stage },
      {
        onSuccess: () =>
          toast.success(CELEBRATION[stage] ?? `Étape : ${stageOf(stage).label}`, {
            description: stage === 'signe' || stage === 'perdu' ? `${label} · les actions ouvertes ont été clôturées.` : label,
          }),
        onError: (e) => toast.error("Impossible de changer l'étape", { description: e.message }),
      },
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'group inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium ring-1 ring-inset transition-[box-shadow,transform] outline-none active:scale-[0.97] focus-visible:ring-[3px]',
          current.soft,
        )}
      >
        <span className={cn('size-2 rounded-full', current.dot)} />
        {current.label}
        <ChevronDown className="size-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Déplacer dans le pipeline</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={client.stage} onValueChange={change}>
          {STAGES.map((s, i) => (
            <div key={s.id}>
              {s.id === 'perdu' && <DropdownMenuSeparator />}
              <DropdownMenuRadioItem value={s.id}>
                <span className={cn('size-2 rounded-full', s.dot)} />
                <span className="flex-1">{s.label}</span>
                {s.id !== 'perdu' && <span className="tabular text-[11px] text-muted-foreground">{i + 1}</span>}
              </DropdownMenuRadioItem>
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
