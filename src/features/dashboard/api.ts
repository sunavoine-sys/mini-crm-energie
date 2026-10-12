import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Deal {
  id: string
  client_id: string | null
  signed_on: string | null
  commission_total_ht: number | null
  commercial_id: string | null
  commercial_name: string | null
  company: string | null
  supplier: string | null
  energy: string | null
  status: string | null
}

export interface Commission {
  deal_id: string
  person_id: string | null
  person_name: string | null
  role: string
  theoretical_amount: number | null
  paid_amount: number | null
  payment_status: string | null
}

export interface SupplierPayment {
  deal_id: string
  amount_expected: number | null
  amount_received: number | null
  expected_date: string | null
  status: string
}

export interface Renewal {
  id: string
  client_id: string
  label: string | null
  supplier: string | null
  energy: string
  contract_end_date: string
}

const num = (v: unknown) => (v == null ? null : Number(v))

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_deals')
        .select('id, client_id, signed_on, commission_total_ht, commercial_id, commercial_name, company, supplier, energy, status')
        .is('archived_at', null)
        .order('signed_on', { ascending: false })
      if (error) throw error
      return (data ?? []).map((d) => ({ ...d, commission_total_ht: num(d.commission_total_ht) })) as Deal[]
    },
  })
}

/** RLS : un commercial ne lit que ses propres lignes, l'admin lit tout. */
export function useCommissions() {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_commissions').select('deal_id, person_id, person_name, role, theoretical_amount, paid_amount, payment_status')
      if (error) throw error
      return (data ?? []).map((c) => ({ ...c, theoretical_amount: num(c.theoretical_amount), paid_amount: num(c.paid_amount) })) as Commission[]
    },
  })
}

export function useSupplierPayments() {
  return useQuery({
    queryKey: ['supplier-payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_supplier_payments').select('deal_id, amount_expected, amount_received, expected_date, status')
      if (error) throw error
      return (data ?? []).map((p) => ({ ...p, amount_expected: num(p.amount_expected), amount_received: num(p.amount_received) })) as SupplierPayment[]
    },
  })
}

/** Sites dont le contrat se termine dans les 6 prochains mois. */
export function useRenewals() {
  return useQuery({
    queryKey: ['renewals'],
    queryFn: async () => {
      const today = new Date()
      const until = new Date()
      until.setMonth(until.getMonth() + 6)
      const iso = (d: Date) => d.toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('crm_sites')
        .select('id, client_id, label, supplier, energy, contract_end_date')
        .gte('contract_end_date', iso(today))
        .lte('contract_end_date', iso(until))
        .order('contract_end_date')
      if (error) throw error
      return (data ?? []) as Renewal[]
    },
  })
}
