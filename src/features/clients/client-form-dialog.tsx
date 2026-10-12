import { useState } from 'react'
import { toast } from 'sonner'
import type { Client, ClientInput, StageId } from '@/lib/types'
import { STAGES } from '@/lib/stages'
import { parseDecimal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/auth-context'
import { useProfiles, useSaveClient } from './api'

interface FormState {
  company: string
  first_name: string
  last_name: string
  email: string
  phone: string
  siret: string
  address: string
  stage: StageId
  lost_reason: string
  owner_id: string
  annual_budget: string
  acd_signed: boolean
  notes: string
}

const toForm = (c?: Client | null): FormState => ({
  company: c?.company ?? '',
  first_name: c?.first_name ?? '',
  last_name: c?.last_name ?? '',
  email: c?.email ?? '',
  phone: c?.phone ?? '',
  siret: c?.siret ?? '',
  address: c?.address ?? '',
  stage: c?.stage ?? 'prospect',
  lost_reason: c?.lost_reason ?? '',
  owner_id: c?.owner_id ?? '',
  annual_budget: c?.annual_budget != null ? String(c.annual_budget).replace('.', ',') : '',
  acd_signed: c?.acd_signed ?? false,
  notes: c?.notes ?? '',
})

const blankToNull = (v: string) => (v.trim() ? v.trim() : null)

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSaved?: (client: Client) => void
}

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: ClientFormDialogProps) {
  const { isAdmin } = useAuth()
  const profiles = useProfiles(isAdmin && open)
  const save = useSaveClient()
  const [form, setForm] = useState<FormState>(() => toForm(client))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const editing = !!client

  // Réinitialise le formulaire à chaque ouverture (pattern « état dérivé » de React)
  const [openedFor, setOpenedFor] = useState<{ open: boolean; client?: Client | null }>({ open, client })
  if (openedFor.open !== open || openedFor.client !== client) {
    setOpenedFor({ open, client })
    if (open) {
      setForm(toForm(client))
      setErrors({})
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  function validate() {
    const e: typeof errors = {}
    if (!form.company.trim()) e.company = "Le nom de l'entreprise est obligatoire."
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Adresse email invalide.'
    const siret = form.siret.replace(/\s/g, '')
    if (siret && !/^\d{14}$/.test(siret)) e.siret = 'Le SIRET contient 14 chiffres.'
    if (form.annual_budget.trim() && parseDecimal(form.annual_budget) == null) e.annual_budget = 'Montant invalide.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(ev?: React.FormEvent) {
    ev?.preventDefault()
    if (!validate()) return
    const input: ClientInput = {
      company: form.company.trim(),
      first_name: blankToNull(form.first_name),
      last_name: blankToNull(form.last_name),
      email: blankToNull(form.email),
      phone: blankToNull(form.phone),
      siret: blankToNull(form.siret.replace(/\s/g, '')),
      address: blankToNull(form.address),
      stage: form.stage,
      lost_reason: form.stage === 'perdu' ? blankToNull(form.lost_reason) : null,
      annual_budget: parseDecimal(form.annual_budget),
      acd_signed: form.acd_signed,
      notes: blankToNull(form.notes),
    }
    if (isAdmin && form.owner_id) input.owner_id = form.owner_id

    save.mutate(
      { id: client?.id, input },
      {
        onSuccess: (saved) => {
          toast.success(editing ? 'Dossier mis à jour' : 'Client créé', { description: saved.company ?? undefined })
          onSaved?.(saved)
          onOpenChange(false)
        },
        onError: (e) => toast.error("Échec de l'enregistrement", { description: e.message }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le dossier' : 'Nouveau client'}</DialogTitle>
            <DialogDescription>{editing ? client?.company : 'Les sites et contrats se renseignent ensuite depuis la fiche.'}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-6">
            <Section title="Entreprise">
              <Field label="Raison sociale" htmlFor="company" error={errors.company} className="sm:col-span-2">
                <Input id="company" autoFocus value={form.company} onChange={(e) => set('company', e.target.value)} aria-invalid={!!errors.company} placeholder="Boulangerie Martin" />
              </Field>
              <Field label="SIRET" htmlFor="siret" error={errors.siret}>
                <Input id="siret" inputMode="numeric" className="tabular" value={form.siret} onChange={(e) => set('siret', e.target.value)} aria-invalid={!!errors.siret} placeholder="123 456 789 00012" />
              </Field>
              <Field label="Budget énergie annuel" htmlFor="budget" error={errors.annual_budget}>
                <div className="relative">
                  <Input id="budget" inputMode="decimal" className="tabular pr-8" value={form.annual_budget} onChange={(e) => set('annual_budget', e.target.value)} aria-invalid={!!errors.annual_budget} placeholder="12 000" />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                </div>
              </Field>
              <Field label="Adresse" htmlFor="address" className="sm:col-span-2">
                <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="12 rue de la République, 69002 Lyon" />
              </Field>
            </Section>

            <Section title="Contact">
              <Field label="Prénom" htmlFor="first_name">
                <Input id="first_name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
              </Field>
              <Field label="Nom" htmlFor="last_name">
                <Input id="last_name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email}>
                <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} />
              </Field>
              <Field label="Téléphone" htmlFor="phone">
                <Input id="phone" type="tel" className="tabular" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </Section>

            <Section title="Suivi">
              <Field label="Étape du pipeline">
                <Select value={form.stage} onValueChange={(v) => set('stage', v as StageId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className={cn('size-2 rounded-full', s.dot)} />
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {isAdmin ? (
                <Field label="Commercial">
                  <Select value={form.owner_id} onValueChange={(v) => set('owner_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Non attribué" />
                    </SelectTrigger>
                    <SelectContent>
                      {(profiles.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={form.acd_signed} onCheckedChange={(v) => set('acd_signed', v === true)} />
                    ACD signé
                  </label>
                </div>
              )}
              {isAdmin && (
                <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox checked={form.acd_signed} onCheckedChange={(v) => set('acd_signed', v === true)} />
                  ACD signé
                </label>
              )}
              {form.stage === 'perdu' && (
                <Field label="Raison de la perte" htmlFor="lost_reason" className="sm:col-span-2">
                  <Input id="lost_reason" value={form.lost_reason} onChange={(e) => set('lost_reason', e.target.value)} placeholder="Prix, fournisseur conservé, injoignable…" />
                </Field>
              )}
              <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
                <Textarea id="notes" rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Contexte, interlocuteurs, points d'attention…" />
              </Field>
            </Section>
          </DialogBody>

          <DialogFooter>
            <span className="mr-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd> pour enregistrer
            </span>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Enregistrer' : 'Créer le client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
