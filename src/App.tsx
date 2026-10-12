import { AnimatePresence, motion } from 'motion/react'
import { Zap } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { LoginScreen } from '@/features/auth/login-screen'
import { ClientsWorkspace } from '@/features/clients/clients-workspace'

export default function App() {
  const { session, loading } = useAuth()

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="boot" exit={{ opacity: 0 }} className="flex h-dvh items-center justify-center bg-background">
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }} className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background">
            <Zap className="size-4 fill-current" />
          </motion.div>
        </motion.div>
      ) : session ? (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <ClientsWorkspace />
        </motion.div>
      ) : (
        <motion.div key="login" exit={{ opacity: 0 }}>
          <LoginScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
