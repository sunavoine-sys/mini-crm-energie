import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/hooks/use-theme'

function Toaster(props: ToasterProps) {
  const { resolved } = useTheme()
  return (
    <Sonner
      theme={resolved}
      position="bottom-right"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-xl !border !border-border !bg-popover/90 !text-popover-foreground !shadow-lg !backdrop-blur-md !font-sans',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
