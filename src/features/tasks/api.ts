import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/types'

const TASK_COLUMNS = 'id, created_at, client_id, owner_id, title, type, due_date, due_time, notes, done_at'

export const TASK_TYPES = [
  { value: 'relance', label: 'Relance' },
  { value: 'appel', label: 'Appel' },
  { value: 'offre', label: 'Offre' },
  { value: 'échéance', label: 'Échéance' },
] as const

export const taskTypeLabel = (t: string) => TASK_TYPES.find((x) => x.value === t)?.label ?? t

/** Toutes les actions ouvertes (une par client au plus — règle base). */
export function useOpenTasks() {
  return useQuery({
    queryKey: ['tasks', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select(`${TASK_COLUMNS}, crm_clients(company)`)
        .is('done_at', null)
        .order('due_date')
        .order('due_time', { nullsFirst: false })
      if (error) throw error
      return (data ?? []) as unknown as Task[]
    },
  })
}

export function useClientTasks(clientId: string | null) {
  return useQuery({
    queryKey: ['tasks', 'client', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select(TASK_COLUMNS)
        .eq('client_id', clientId!)
        .order('due_date', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<Task, 'client_id' | 'title' | 'type' | 'due_date' | 'due_time' | 'notes'>) => {
      const { error } = await supabase.from('crm_tasks').insert(input)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useToggleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from('crm_tasks')
        .update({ done_at: task.done_at ? null : new Date().toISOString() })
        .eq('id', task.id)
      if (error) throw error
      return !task.done_at
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
