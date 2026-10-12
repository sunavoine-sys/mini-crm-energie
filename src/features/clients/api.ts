import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase'
import type { Activity, Client, ClientInput, Profile, Site, StageId } from '@/lib/types'

const CLIENT_COLUMNS =
  'id, created_at, updated_at, company, siret, first_name, last_name, email, phone, address, stage, stage_changed_at, lost_reason, owner_id, source, tags, notes, acd_signed, annual_budget'

export const keys = {
  clients: ['clients'] as const,
  sitesIndex: ['sites-index'] as const,
  sites: (clientId: string) => ['sites', clientId] as const,
  activities: (clientId: string) => ['activities', clientId] as const,
  profiles: ['profiles'] as const,
}

export function useClients() {
  return useQuery({
    queryKey: keys.clients,
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_clients').select(CLIENT_COLUMNS).order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Client[]
    },
  })
}

export interface SiteSummary {
  suppliers: string[]
  nextEnd: string | null
  count: number
}

/** Index léger des sites par client (fournisseurs, prochaine fin de contrat). */
export function useSitesIndex() {
  return useQuery({
    queryKey: keys.sitesIndex,
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_sites').select('client_id, supplier, contract_end_date')
      if (error) throw error
      const index = new Map<string, SiteSummary>()
      for (const s of data ?? []) {
        const entry = index.get(s.client_id) ?? { suppliers: [], nextEnd: null, count: 0 }
        entry.count++
        if (s.supplier && !entry.suppliers.includes(s.supplier)) entry.suppliers.push(s.supplier)
        if (s.contract_end_date && (!entry.nextEnd || s.contract_end_date < entry.nextEnd)) entry.nextEnd = s.contract_end_date
        index.set(s.client_id, entry)
      }
      return index
    },
  })
}

/** Liste des commerciaux — lisible en entier par un admin uniquement (RLS). */
export function useProfiles(enabled: boolean) {
  return useQuery({
    queryKey: keys.profiles,
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, role, phone').order('full_name')
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export function useSaveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ClientInput }) => {
      const query = id
        ? supabase.from('crm_clients').update(input).eq('id', id).select(CLIENT_COLUMNS).single()
        : supabase.from('crm_clients').insert(input).select(CLIENT_COLUMNS).single()
      const { data, error } = await query
      if (error) throw error
      return data as Client
    },
    onSuccess: (client) => {
      qc.setQueryData<Client[]>(keys.clients, (old) => {
        if (!old) return [client]
        const exists = old.some((c) => c.id === client.id)
        return exists ? old.map((c) => (c.id === client.id ? client : c)) : [client, ...old]
      })
      qc.invalidateQueries({ queryKey: keys.activities(client.id) })
    },
  })
}

/** Changement d'étape optimiste : la carte bouge tout de suite, rollback si refus. */
export function useUpdateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stage, lost_reason }: { id: string; stage: StageId; lost_reason?: string | null }) => {
      const patch = lost_reason !== undefined ? { stage, lost_reason } : { stage }
      const { data, error } = await supabase.from('crm_clients').update(patch).eq('id', id).select(CLIENT_COLUMNS).single()
      if (error) throw error
      return data as Client
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: keys.clients })
      const previous = qc.getQueryData<Client[]>(keys.clients)
      qc.setQueryData<Client[]>(keys.clients, (old) =>
        old?.map((c) => (c.id === id ? { ...c, stage, stage_changed_at: new Date().toISOString() } : c)),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(keys.clients, ctx.previous),
    onSuccess: (client) => {
      qc.setQueryData<Client[]>(keys.clients, (old) => old?.map((c) => (c.id === client.id ? client : c)))
      // Les triggers base journalisent l'étape et ferment les tâches si signé/perdu
      qc.invalidateQueries({ queryKey: keys.activities(client.id) })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('crm_clients').delete().eq('id', id).select('id')
      if (error) throw error
      // RLS : un commercial ne peut pas supprimer un client lié à une vente → 0 ligne
      if (!data?.length) throw new Error('Suppression refusée : ce dossier est lié à une vente. Demande à un admin.')

      // Nettoyage best-effort du stockage (les ACD signées restent protégées)
      const { data: files } = await supabase.storage.from(DOCUMENTS_BUCKET).list(id, { limit: 1000 })
      if (files?.length) await supabase.storage.from(DOCUMENTS_BUCKET).remove(files.map((f) => `${id}/${f.name}`))
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<Client[]>(keys.clients, (old) => old?.filter((c) => c.id !== id))
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: keys.sitesIndex })
    },
  })
}

/* ───────────── Sites (points de livraison) ───────────── */

export function useSites(clientId: string | null) {
  return useQuery({
    queryKey: keys.sites(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_sites').select('*').eq('client_id', clientId!).order('created_at')
      if (error) throw error
      return (data ?? []) as Site[]
    },
  })
}

export function useSaveSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: Omit<Site, 'id' | 'created_at'> }) => {
      const query = id ? supabase.from('crm_sites').update(input).eq('id', id) : supabase.from('crm_sites').insert(input)
      const { error } = await query
      if (error) throw error
      return input.client_id
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: keys.sites(clientId) })
      qc.invalidateQueries({ queryKey: keys.sitesIndex })
    },
  })
}

export function useDeleteSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (site: Site) => {
      const { error } = await supabase.from('crm_sites').delete().eq('id', site.id)
      if (error) throw error
      return site.client_id
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: keys.sites(clientId) })
      qc.invalidateQueries({ queryKey: keys.sitesIndex })
    },
  })
}

/* ───────────── Activités (journal + notes) ───────────── */

export function useActivities(clientId: string | null) {
  return useQuery({
    queryKey: keys.activities(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('id, created_at, client_id, user_id, type, body, meta')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(60)
      if (error) throw error
      return (data ?? []) as Activity[]
    },
  })
}

export function useAddNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientId, body }: { clientId: string; body: string }) => {
      const { error } = await supabase.from('crm_activities').insert({ client_id: clientId, type: 'note', body })
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: keys.activities(clientId) }),
  })
}

/* ───────────── Réglages : délais d'étape (relance si le dossier stagne) ───────────── */

const DEFAULT_STAGE_DELAYS: Partial<Record<StageId, number>> = { prospect: 7, factures: 3, acd: 5, offre: 5 }

export function useStageDelays() {
  return useQuery({
    queryKey: ['settings', 'stage_delays'],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('crm_settings').select('value').eq('key', 'stage_delays').maybeSingle()
      return { ...DEFAULT_STAGE_DELAYS, ...((data?.value as Partial<Record<StageId, number>> | null) ?? {}) }
    },
  })
}
