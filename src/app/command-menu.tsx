import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRightLeft, Building2, Clock, Keyboard, LogOut, Monitor, Moon, Pencil, Plus, Sun } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { Client, StageId } from '@/lib/types'
import { STAGES } from '@/lib/stages'
import { contactName } from '@/lib/format'
import { readRecents } from '@/lib/recents'
import { MOD } from '@/lib/platform'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { StageBadge } from '@/components/app/stage-badge'
import { useAuth } from '@/features/auth/auth-context'
import { useClients } from '@/features/clients/api'
import { useStageChange } from '@/features/clients/use-stage-change'
import { NAV_ITEMS } from './nav'

export type CommandPage = { type: 'root' } | { type: 'stage'; client: Client }

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPage: CommandPage
  activeClient: Client | null
  onNewClient: () => void
  onEditClient: (c: Client) => void
  onShortcuts: () => void
}

export function CommandMenu({ open, onOpenChange, initialPage, activeClient, onNewClient, onEditClient, onShortcuts }: CommandMenuProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
  const { setTheme } = useTheme()
  const { data: clients } = useClients()
  const stageChange = useStageChange()
  const [page, setPage] = useState<CommandPage>(initialPage)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')

  // Réinitialise à chaque ouverture (état dérivé)
  const [lastOpen, setLastOpen] = useState(open)
  if (lastOpen !== open) {
    setLastOpen(open)
    if (open) {
      setPage(initialPage)
      setSearch('')
    }
  }

  const recents = useMemo(() => {
    if (!open || !clients) return []
    const byId = new Map(clients.map((c) => [c.id, c]))
    return readRecents().map((id) => byId.get(id)).filter((c): c is Client => !!c)
  }, [open, clients])

  const close = () => onOpenChange(false)
  const run = (fn: () => void) => () => {
    close()
    fn()
  }

  function goToStagePage(c: Client) {
    setPage({ type: 'stage', client: c })
    setSearch('')
  }

  function changeStage(c: Client, stage: StageId) {
    close()
    stageChange(c, stage)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (page.type === 'root' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const id = selected.split(' ')[1]
      const c = clients?.find((x) => x.id === id)
      if (c && /^(recent|client) /.test(selected)) {
        e.preventDefault()
        goToStagePage(c)
        return
      }
    }
    if (page.type !== 'root' && (e.key === 'Escape' || (e.key === 'Backspace' && !search))) {
      e.preventDefault()
      setPage({ type: 'root' })
    }
  }

  const showClients = page.type === 'root' && search.trim().length > 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 dark:bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed top-[14vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover/95 shadow-2xl backdrop-blur-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:duration-100',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Palette de commandes</DialogPrimitive.Title>
          <Command loop value={selected} onValueChange={setSelected} onKeyDown={onKeyDown} key={page.type === 'stage' ? `stage-${page.client.id}` : 'root'}>
            {page.type === 'stage' && (
              <div className="flex items-center gap-2 px-4 pt-3">
                <button onClick={() => setPage({ type: 'root' })} className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-3" /> {page.client.company}
                </button>
                <span className="text-xs text-muted-foreground">Changer l'étape</span>
              </div>
            )}
            <CommandInput
              value={search}
              onValueChange={setSearch}
              autoFocus
              placeholder={page.type === 'stage' ? 'Choisir une étape…' : 'Rechercher un client, une action, une page…'}
            />
            <CommandList>
              <CommandEmpty>Aucun résultat pour « {search} ».</CommandEmpty>

              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={page.type} initial={{ opacity: 0, x: page.type === 'root' ? -8 : 8 }} animate={{ opacity: 1, x: 0 }} transition={spring.snappy}>
                  {page.type === 'stage' ? (
                    <CommandGroup heading="Pipeline">
                      {STAGES.map((s, i) => (
                        <CommandItem key={s.id} value={`${s.label} ${s.short}`} onSelect={() => changeStage(page.client, s.id)}>
                          <span className={cn('size-2.5 rounded-full', s.dot)} />
                          <span className="flex-1">{s.label}</span>
                          {s.id === page.client.stage ? <span className="text-xs text-muted-foreground">Actuelle</span> : s.id !== 'perdu' && <Kbd>{i + 1}</Kbd>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <>
                      {activeClient && !search && (
                        <CommandGroup heading={`Dossier actif · ${activeClient.company ?? ''}`}>
                          <CommandItem value="changer etape statut deplacer pipeline" onSelect={() => goToStagePage(activeClient)}>
                            <ArrowRightLeft />
                            <span className="flex-1">Changer l'étape…</span>
                            <StageBadge stage={activeClient.stage} short />
                          </CommandItem>
                          <CommandItem value="modifier dossier editer" onSelect={run(() => onEditClient(activeClient))}>
                            <Pencil />
                            <span className="flex-1">Modifier le dossier</span>
                            <Kbd>E</Kbd>
                          </CommandItem>
                        </CommandGroup>
                      )}

                      {!search && recents.length > 0 && (
                        <CommandGroup heading="Récents">
                          {recents.map((c) => (
                            <ClientItem key={c.id} client={c} prefix="recent" onOpen={run(() => navigate(`/clients/${c.id}`))} icon={<Clock />} />
                          ))}
                        </CommandGroup>
                      )}

                      {showClients && (
                        <CommandGroup heading="Clients">
                          {(clients ?? []).map((c) => (
                            <ClientItem key={c.id} client={c} prefix="client" onOpen={run(() => navigate(`/clients/${c.id}`))} />
                          ))}
                        </CommandGroup>
                      )}

                      <CommandGroup heading="Actions">
                        <CommandItem value="nouveau client creer prospect lead ajouter" onSelect={run(onNewClient)}>
                          <Plus />
                          <span className="flex-1">Nouveau client</span>
                          <Kbd>N</Kbd>
                        </CommandItem>
                        <CommandItem value="raccourcis clavier aide" onSelect={run(onShortcuts)}>
                          <Keyboard />
                          <span className="flex-1">Raccourcis clavier</span>
                          <Kbd>?</Kbd>
                        </CommandItem>
                      </CommandGroup>

                      <CommandGroup heading="Navigation">
                        {NAV_ITEMS.map((n) => (
                          <CommandItem key={n.to} value={`aller ${n.label}`} onSelect={run(() => navigate(n.to))} disabled={location.pathname === n.to}>
                            <n.icon />
                            <span className="flex-1">{n.label}</span>
                            <span className="flex gap-0.5">
                              <Kbd>G</Kbd>
                              <Kbd>{n.key.toUpperCase()}</Kbd>
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      <CommandGroup heading="Préférences">
                        <CommandItem value="theme clair light" onSelect={run(() => setTheme('light'))}>
                          <Sun /> Thème clair
                        </CommandItem>
                        <CommandItem value="theme sombre dark nuit" onSelect={run(() => setTheme('dark'))}>
                          <Moon /> Thème sombre
                        </CommandItem>
                        <CommandItem value="theme systeme auto" onSelect={run(() => setTheme('system'))}>
                          <Monitor /> Thème du système
                        </CommandItem>
                        <CommandItem value="se deconnecter logout quitter" onSelect={run(() => void signOut())}>
                          <LogOut /> Se déconnecter
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </CommandList>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-subtle/80 px-4 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> naviguer <Kbd className="ml-1.5">↵</Kbd> ouvrir
              </span>
              {page.type === 'root' ? (
                <span className="hidden items-center gap-1.5 sm:flex">
                  <Kbd>{MOD}</Kbd>
                  <Kbd>↵</Kbd> changer l'étape d'un client
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Kbd>⌫</Kbd> retour
                </span>
              )}
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ClientItem({ client: c, prefix, onOpen, icon }: { client: Client; prefix: string; onOpen: () => void; icon?: React.ReactNode }) {
  const contact = contactName(c)
  return (
    <CommandItem
      value={`${prefix} ${c.id} ${c.company ?? ''} ${contact} ${c.siret ?? ''} ${c.email ?? ''}`}
      keywords={[c.company ?? '', contact, c.siret ?? '']}
      onSelect={onOpen}
    >
      {icon ?? <Building2 />}
      <span className="min-w-0 flex-1 truncate">
        {c.company || 'Sans nom'}
        {contact && <span className="ml-2 text-xs text-muted-foreground">{contact}</span>}
      </span>
      <StageBadge stage={c.stage} short />
    </CommandItem>
  )
}
