import { ChevronDown } from 'lucide-react'
import { STAGES, stageOf } from '@/lib/stages'
import type { Client, StageId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStageChange } from '@/features/clients/use-stage-change'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function StageMenu({ client }: { client: Client }) {
  const changeStage = useStageChange()
  const current = stageOf(client.stage)

  function change(value: string) {
    changeStage(client, value as StageId)
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
