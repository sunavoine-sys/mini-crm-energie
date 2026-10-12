import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { MOD } from '@/lib/platform'
import { NAV_ITEMS } from './nav'


const SECTIONS: { title: string; items: { label: string; keys: string[][] }[] }[] = [
  {
    title: 'Général',
    items: [
      { label: 'Palette de commandes', keys: [[MOD, 'K']] },
      { label: 'Rechercher', keys: [['/']] },
      { label: 'Nouveau client', keys: [['N']] },
      { label: 'Replier la barre latérale', keys: [['[']] },
      { label: 'Afficher cette aide', keys: [['?']] },
    ],
  },
  {
    title: 'Navigation',
    items: NAV_ITEMS.map((n) => ({ label: n.label, keys: [['G', n.key.toUpperCase()]] })),
  },
  {
    title: 'Dossier client',
    items: [
      { label: 'Modifier le dossier', keys: [['E']] },
      { label: "Changer l'étape", keys: [['S']] },
      { label: 'Fermer le dossier', keys: [['Échap']] },
      { label: 'Enregistrer un formulaire', keys: [[MOD, '↵']] },
    ],
  },
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
          <DialogDescription>Tout le CRM se pilote sans la souris.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-6 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.title} className={s.title === 'Général' ? 'sm:row-span-2' : ''}>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{s.title}</h3>
              <ul className="space-y-1">
                {s.items.map((i) => (
                  <li key={i.label} className="flex items-center justify-between gap-3 py-1 text-[13px]">
                    <span>{i.label}</span>
                    <span className="flex items-center gap-1">
                      {i.keys[0].map((k, idx) => (
                        <span key={k} className="flex items-center gap-1">
                          {idx > 0 && i.keys[0][0] === 'G' && <span className="text-[11px] text-muted-foreground">puis</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

