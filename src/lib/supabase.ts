import { createClient } from '@supabase/supabase-js'

// Valeurs par défaut = projet « crm-energie ». La clé publishable est publique par
// conception ; l'accès aux données est protégé par les politiques RLS.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://bbghzarbawbugrmwlxjj.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_Rfr6TeYwOI3jIseYVT70BQ_fYCgCD3p'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dms-crm-auth' },
})

export const DOCUMENTS_BUCKET = 'Documents'
