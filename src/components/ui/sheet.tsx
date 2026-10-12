import * as React from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close

const sideClass = {
  right: 'inset-y-0 right-0 h-full w-[min(100vw,560px)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  left: 'inset-y-0 left-0 h-full w-[min(86vw,300px)] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  bottom: 'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
}

function SheetContent({
  className,
  children,
  side = 'right',
  hideClose = false,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: keyof typeof sideClass; hideClose?: boolean; overlayClassName?: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 dark:bg-black/50',
          overlayClassName,
        )}
      />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col border-border bg-background shadow-2xl outline-none',
          'data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-out data-[state=closed]:duration-200',
          sideClass[side],
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <SheetPrimitive.Close className="absolute top-3.5 right-3.5 z-10 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none">
            <X className="size-4" />
            <span className="sr-only">Fermer</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('text-base font-semibold tracking-tight', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-[13px] text-muted-foreground', className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription }
