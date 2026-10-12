import { Label } from './label'
import { cn } from '@/lib/utils'

/** Champ de formulaire : label + contrôle + aide/erreur, espacement constant. */
function Field({ label, htmlFor, hint, error, className, children }: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export { Field }
