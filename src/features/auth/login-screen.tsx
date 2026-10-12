import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { spring } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message)
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]"
      />
      <div aria-hidden className="pointer-events-none absolute top-[-20%] left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.gentle}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-card shadow-lg">
            <Zap className="size-5 fill-primary text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Connexion à DMS CRM</h1>
            <p className="text-sm text-muted-foreground">Courtage en énergie · Dynamic Makers Sales</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-md">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@dms-conseil.fr" />
          </Field>
          <Field label="Mot de passe" htmlFor="password">
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive" role="alert">
              {error}
            </motion.p>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            Se connecter
            {!loading && <ArrowRight />}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
