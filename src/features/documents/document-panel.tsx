import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, Eye, FileImage, FileSpreadsheet, FileText, FolderOpen, Lock, MoreHorizontal, Trash2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import type { StoredDocument } from '@/lib/types'
import { formatBytes, formatRelativeTime } from '@/lib/format'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { getSignedUrl, useDeleteDocument, useDocuments, useUploadDocuments } from './api'

const MAX_SIZE = 25 * 1024 * 1024

function iconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'gif'].includes(ext)) return FileImage
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet
  return FileText
}

export function DocumentPanel({ clientId }: { clientId: string }) {
  const { isAdmin } = useAuth()
  const { data: docs, isLoading, error } = useDocuments(clientId)
  const upload = useUploadDocuments()
  const del = useDeleteDocument()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [preview, setPreview] = useState<{ doc: StoredDocument; url: string } | null>(null)
  const [toDelete, setToDelete] = useState<StoredDocument | null>(null)

  function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (!files.length) return
    const tooBig = files.filter((f) => f.size > MAX_SIZE)
    if (tooBig.length) {
      toast.error('Fichier trop volumineux', { description: `${tooBig.map((f) => f.name).join(', ')} dépasse 25 Mo.` })
      return
    }
    setProgress({ done: 0, total: files.length })
    upload.mutate(
      { clientId, files, onProgress: (done) => setProgress({ done, total: files.length }) },
      {
        onSuccess: () => toast.success(files.length > 1 ? `${files.length} documents importés` : 'Document importé', { description: files.length === 1 ? files[0].name : undefined }),
        onError: (e) => toast.error("Échec de l'import", { description: e.message }),
        onSettled: () => {
          setTimeout(() => setProgress(null), 600)
          if (inputRef.current) inputRef.current.value = ''
        },
      },
    )
  }

  async function open(doc: StoredDocument) {
    try {
      setPreview({ doc, url: await getSignedUrl(doc.path) })
    } catch (e) {
      toast.error("Impossible d'ouvrir le document", { description: (e as Error).message })
    }
  }

  async function download(doc: StoredDocument) {
    try {
      window.location.assign(await getSignedUrl(doc.path, true))
    } catch (e) {
      toast.error('Téléchargement impossible', { description: (e as Error).message })
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'relative overflow-hidden rounded-xl border border-dashed transition-[border-color,background-color,box-shadow] duration-200',
          dragging ? 'border-primary bg-primary/5 shadow-[0_0_0_4px] shadow-primary/10' : 'border-border bg-subtle',
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="flex w-full flex-col items-center gap-2 px-6 py-7 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <motion.div animate={dragging ? { y: -3, scale: 1.06 } : { y: 0, scale: 1 }} transition={spring.snappy} className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <UploadCloud className={cn('size-5 transition-colors', dragging ? 'text-primary' : 'text-muted-foreground')} />
          </motion.div>
          <p className="text-sm font-medium">{dragging ? 'Dépose pour importer' : 'Glisse tes factures ici'}</p>
          <p className="text-xs text-muted-foreground">ou clique pour parcourir · PDF, images, Excel · 25 Mo max</p>
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        <AnimatePresence>
          {progress && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 h-1 bg-primary/10">
              <motion.div className="h-full bg-primary" initial={{ width: '4%' }} animate={{ width: `${Math.max(4, (progress.done / progress.total) * 100)}%` }} transition={spring.smooth} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isLoading ? (
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="size-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState compact icon={FolderOpen} title="Documents indisponibles" description={error.message} />
      ) : !docs?.length ? (
        <EmptyState compact icon={FolderOpen} title="Aucun document" description="Factures, ACD et offres de ce client apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          <AnimatePresence initial={false}>
            {docs.map((d) => {
              const Icon = iconFor(d.name)
              const locked = d.protected && !isAdmin
              return (
                <motion.li
                  key={d.path}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring.smooth}
                  className="group"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40">
                    <button onClick={() => open(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none">
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', d.protected ? 'bg-stage-acd/10 text-stage-acd ring-stage-acd/20' : 'bg-muted text-muted-foreground ring-border')}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                          <span className="truncate">{d.displayName}</span>
                          {d.protected && <Lock className="size-3 shrink-0 text-stage-acd" aria-label="Document protégé" />}
                        </span>
                        <span className="tabular block text-[11px] text-muted-foreground">
                          {[formatBytes(d.size), d.createdAt && formatRelativeTime(d.createdAt)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-xs" variant="ghost" className="opacity-50 group-hover:opacity-100" aria-label="Actions du document">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => open(d)}>
                          <Eye /> Aperçu
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => download(d)}>
                          <Download /> Télécharger
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" disabled={locked} onSelect={() => setToDelete(d)}>
                          {locked ? <Lock /> : <Trash2 />} {locked ? 'Protégé (ACD signée)' : 'Supprimer'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="h-[88vh] max-w-5xl">
          <DialogHeader className="pr-12">
            <DialogTitle className="truncate">{preview?.doc.displayName}</DialogTitle>
            <DialogDescription className="flex items-center gap-3">
              {preview && formatBytes(preview.doc.size)}
              {preview && (
                <button className="inline-flex items-center gap-1 text-foreground hover:underline" onClick={() => download(preview.doc)}>
                  <Download className="size-3.5" /> Télécharger
                </button>
              )}
            </DialogDescription>
          </DialogHeader>
          {preview && <iframe src={preview.url} title={preview.doc.displayName} className="min-h-0 w-full flex-1 bg-white" />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce document ?"
        description={`« ${toDelete?.displayName} » sera définitivement supprimé du stockage.`}
        onConfirm={() =>
          toDelete &&
          del.mutate(
            { clientId, doc: toDelete },
            {
              onSuccess: () => toast.success('Document supprimé'),
              onError: (e) => toast.error('Suppression impossible', { description: e.message }),
            },
          )
        }
      />
    </div>
  )
}
