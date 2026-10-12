export type StageId = 'prospect' | 'factures' | 'acd' | 'offre' | 'signe' | 'perdu'
export type Role = 'admin' | 'commercial'

export interface Profile {
  id: string
  full_name: string
  role: Role
  phone: string | null
}

export interface Client {
  id: string
  created_at: string
  updated_at: string
  company: string | null
  siret: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  stage: StageId
  stage_changed_at: string
  lost_reason: string | null
  owner_id: string | null
  source: string | null
  tags: string[]
  notes: string | null
  acd_signed: boolean
  annual_budget: number | null
}

export type ClientInput = Pick<
  Client,
  | 'company'
  | 'siret'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'address'
  | 'stage'
  | 'lost_reason'
  | 'notes'
  | 'acd_signed'
  | 'annual_budget'
> & { owner_id?: string | null }

export type Energy = 'elec' | 'gaz'
export type ContractType = 'base' | 'hphc' | '4plages'

export interface Site {
  id: string
  created_at: string
  client_id: string
  label: string | null
  energy: Energy
  point_id: string | null
  segment: string | null
  tariff_category: string | null
  subscribed_power_kva: number | null
  annual_kwh: number | null
  supplier: string | null
  contract_type: ContractType | null
  price_base: number | null
  price_hp: number | null
  price_hc: number | null
  price_hpe: number | null
  price_hph: number | null
  price_hce: number | null
  price_hch: number | null
  current_monthly_amount: number | null
  contract_end_date: string | null
}

export type SiteInput = Omit<Site, 'id' | 'created_at'>

export type TaskType = 'relance' | 'appel' | 'offre' | 'échéance'

export interface Task {
  id: string
  created_at: string
  client_id: string | null
  owner_id: string | null
  title: string
  type: TaskType | string
  due_date: string
  due_time: string | null
  notes: string | null
  done_at: string | null
  crm_clients?: { company: string | null } | null
}

export interface Activity {
  id: string
  created_at: string
  client_id: string
  user_id: string | null
  type: string
  body: string | null
  meta: Record<string, unknown>
}

export interface StoredDocument {
  name: string
  path: string
  displayName: string
  size: number
  createdAt: string | null
  protected: boolean
}
