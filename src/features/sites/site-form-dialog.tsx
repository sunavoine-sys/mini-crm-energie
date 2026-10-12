import { useState } from 'react'
import { Flame, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { ContractType, Energy, Site } from '@/lib/types'
import { parseDecimal } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSaveSite } from '@/features/clients/api'

const SUPPLIERS = [
  'EDF', 'Engie', 'TotalEnergies', 'Vattenfall', 'OHM Énergie', 'Ekwateur', 'Mint Énergie', 'Alpiq', 'Gazel Énergie', 'Enercoop', 'Ilek', 'Octopus Energy', 'Plüm', 'Primeo', 'Eni', 'Gaz de Bordeaux',
]

const SEGMENTS: Record<Energy, string[]> = { elec: ['C5', 'C4', 'C3', 'C2'], gaz: ['T1', 'T2', 'T3', 'T4'] }

const PRICE_FIELDS: Record<ContractType, { key: keyof Site; label: string }[]> = {
  base: [{ key: 'price_base', label: 'Prix kWh' }],
  hphc: [
    { key: 'price_hp', label: 'Heures pleines' },
    { key: 'price_hc', label: 'Heures creuses' },
  ],
  '4plages': [
    { key: 'price_hph', label: 'HP hiver' },
    { key: 'price_hch', label: 'HC hiver' },
    { key: 'price_hpe', label: 'HP été' },
    { key: 'price_hce', label: 'HC été' },
  ],
}

type NumKey = 'price_base' | 'price_hp' | 'price_hc' | 'price_hpe' | 'price_hph' | 'price_hce' | 'price_hch' | 'subscribed_power_kva' | 'annual_kwh' | 'current_monthly_amount'
const NUM_KEYS: NumKey[] = ['price_base', 'price_hp', 'price_hc', 'price_hpe', 'price_hph', 'price_hce', 'price_hch', 'subscribed_power_kva', 'annual_kwh', 'current_monthly_amount']

type FormState = {
  label: string
  energy: Energy
  point_id: string
  segment: string
  supplier: string
  contract_type: ContractType | ''
  contract_end_date: string
} & Record<NumKey, string>

const str = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','))

function toForm(s?: Site | null): FormState {
  const nums = Object.fromEntries(NUM_KEYS.map((k) => [k, str(s?.[k] as number | null)])) as Record<NumKey, string>
  return {
    label: s?.label ?? '',
    energy: s?.energy ?? 'elec',
    point_id: s?.point_id ?? '',
    segment: s?.segment ?? '',
    supplier: s?.supplier ?? '',
    contract_type: s?.contract_type ?? '',
    contract_end_date: s?.contract_end_date ?? '',
    ...nums,
  }
}

interface SiteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  site?: Site | null
}

export function SiteFormDialog({ open, onOpenChange, clientId, site }: SiteFormDialogProps) {
  const save = useSaveSite()
  const [form, setForm] = useState<FormState>(() => toForm(site))
  const [invalid, setInvalid] = useState<NumKey[]>([])

  const [openedFor, setOpenedFor] = useState<{ open: boolean; site?: Site | null }>({ open, site })
  if (openedFor.open !== open || openedFor.site !== site) {
    setOpenedFor({ open, site })
    if (open) {
      setForm(toForm(site))
      setInvalid([])
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const bad = NUM_KEYS.filter((k) => form[k].trim() && parseDecimal(form[k]) == null)
    setInvalid(bad)
    if (bad.length) return

    const ct = form.contract_type || null
    const allowed = new Set(ct ? PRICE_FIELDS[ct].map((f) => f.key) : [])
    const num = (k: NumKey) => (k.startsWith('price_') && !allowed.has(k) ? null : parseDecimal(form[k]))

    save.mutate(
      {
        id: site?.id,
        input: {
          client_id: clientId,
          label: form.label.trim() || null,
          energy: form.energy,
          point_id: form.point_id.replace(/\s/g, '') || null,
          segment: form.segment || null,
          tariff_category: site?.tariff_category ?? null,
          supplier: form.supplier.trim() || null,
          contract_type: ct,
          contract_end_date: form.contract_end_date || null,
          price_base: num('price_base'),
          price_hp: num('price_hp'),
          price_hc: num('price_hc'),
          price_hpe: num('price_hpe'),
          price_hph: num('price_hph'),
          price_hce: num('price_hce'),
          price_hch: num('price_hch'),
          subscribed_power_kva: num('subscribed_power_kva'),
          annual_kwh: num('annual_kwh'),
          current_monthly_amount: num('current_monthly_amount'),
        },
      },
      {
        onSuccess: () => {
          toast.success(site ? 'Site mis à jour' : 'Site ajouté')
          onOpenChange(false)
        },
        onError: (err) => toast.error("Échec de l'enregistrement du site", { description: err.message }),
      },
    )
  }

  const numInput = (k: NumKey, placeholder?: string, suffix?: string) => (
    <div className="relative">
      <Input inputMode="decimal" className="tabular pr-12" value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={invalid.includes(k)} placeholder={placeholder} />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{site ? 'Modifier le site' : 'Nouveau site'}</DialogTitle>
            <DialogDescription>Point de livraison, contrat actuel et grille tarifaire.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                layoutId="site-energy"
                value={form.energy}
                onChange={(v) => setForm((f) => ({ ...f, energy: v, segment: '' }))}
                options={[
                  { value: 'elec', label: <><Zap className="size-3.5" /> Électricité</> },
                  { value: 'gaz', label: <><Flame className="size-3.5" /> Gaz</> },
                ]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Libellé" htmlFor="site-label">
                <Input id="site-label" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Magasin principal" />
              </Field>
              <Field label={form.energy === 'elec' ? 'PDL / PRM' : 'PCE'} htmlFor="site-point">
                <Input id="site-point" className="tabular" value={form.point_id} onChange={(e) => set('point_id', e.target.value)} placeholder="14 chiffres" />
              </Field>
              <Field label="Fournisseur actuel" htmlFor="site-supplier">
                <Input id="site-supplier" list="supplier-list" value={form.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="EDF, Engie…" />
                <datalist id="supplier-list">
                  {SUPPLIERS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="Segment">
                <Select value={form.segment} onValueChange={(v) => set('segment', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS[form.energy].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fin de contrat" htmlFor="site-end">
                <Input id="site-end" type="date" value={form.contract_end_date} onChange={(e) => set('contract_end_date', e.target.value)} />
              </Field>
              <Field label="Consommation annuelle">{numInput('annual_kwh', '45 000', 'kWh')}</Field>
              {form.energy === 'elec' && <Field label="Puissance souscrite">{numInput('subscribed_power_kva', '36', 'kVA')}</Field>}
              <Field label="Mensualité actuelle">{numInput('current_monthly_amount', '850', '€')}</Field>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-subtle p-4">
              <Field label="Structure tarifaire">
                <Select value={form.contract_type} onValueChange={(v) => set('contract_type', v as ContractType)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Prix unique (base)</SelectItem>
                    <SelectItem value="hphc">Heures pleines / creuses</SelectItem>
                    <SelectItem value="4plages">4 plages horosaisonnières</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.contract_type && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRICE_FIELDS[form.contract_type].map((f) => (
                    <Field key={f.key} label={f.label}>
                      {numInput(f.key as NumKey, '0,1450', '€/kWh')}
                    </Field>
                  ))}
                </div>
              )}
            </div>
            {invalid.length > 0 && <p className="text-xs text-destructive">Certaines valeurs numériques sont invalides.</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={save.isPending}>
              {site ? 'Enregistrer' : 'Ajouter le site'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
