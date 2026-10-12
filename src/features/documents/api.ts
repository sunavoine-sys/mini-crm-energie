import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase'
import type { StoredDocument } from '@/lib/types'

const isProtected = (name: string) => name.includes('_ACD_signee_')

/** « 1791799753383_ACD_signee_COUDISTRIB.pdf » → « ACD signee COUDISTRIB.pdf » */
function displayName(name: string) {
  return name.replace(/^\d{10,}[-_]/, '').replace(/_/g, ' ')
}

/** Même convention que l'app v2 : {timestamp}_{nom assaini} */
function storageName(file: File) {
  const clean = file.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
  return `${Date.now()}_${clean}`
}

export function useDocuments(clientId: string | null) {
  return useQuery({
    queryKey: ['documents', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .list(clientId!, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } })
      if (error) throw error
      return (data ?? [])
        .filter((f) => f.id && f.name !== '.emptyFolderPlaceholder')
        .map<StoredDocument>((f) => ({
          name: f.name,
          path: `${clientId}/${f.name}`,
          displayName: displayName(f.name),
          size: (f.metadata?.size as number | undefined) ?? 0,
          createdAt: f.created_at ?? null,
          protected: isProtected(f.name),
        }))
    },
  })
}

export function useUploadDocuments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientId, files, onProgress }: { clientId: string; files: File[]; onProgress?: (done: number) => void }) => {
      let done = 0
      for (const file of files) {
        const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(`${clientId}/${storageName(file)}`, file, {
          contentType: file.type || undefined,
        })
        if (error) throw new Error(`${file.name} : ${error.message}`)
        onProgress?.(++done)
      }
      return clientId
    },
    onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: ['documents', vars.clientId] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientId, doc }: { clientId: string; doc: StoredDocument }) => {
      const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.path])
      if (error) throw error
      if (!data?.length) throw new Error('Suppression refusée : ce document est protégé.')
      return clientId
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ['documents', clientId] }),
  })
}

export async function getSignedUrl(path: string, download = false) {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 3600, download ? { download: true } : undefined)
  if (error) throw error
  return data.signedUrl
}
