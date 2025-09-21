"use client"

import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/lib/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, ...props }) => (
        <Toast
          key={id}
          className="mb-2
            data-[state=open]:animate-in
            data-[state=closed]:animate-out
            data-[swipe=end]:animate-out
            data-[state=closed]:fade-out-80
            data-[state=closed]:slide-out-to-right-full
            data-[state=open]:slide-in-from-top-full
            data-[state=open]:sm:slide-in-from-bottom-full"
          {...props}
        >
          <div className="grid gap-1">
            {title && <div className="font-semibold">{title}</div>}
            {description && <div className="text-sm opacity-90">{description}</div>}
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
