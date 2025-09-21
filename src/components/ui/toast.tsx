"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 right-4 z-[100] flex w-full max-w-xs flex-col gap-2 p-0 sm:max-w-sm",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = "ToastViewport"

// Toast animation keyframes
const slideIn = {
  from: { transform: 'translateX(calc(100% + 8px))' },
  to: { transform: 'translateX(0)' },
};

const slideOut = {
  from: { transform: 'translateX(0)' },
  to: { transform: 'translateX(calc(100% + 8px))' },
};

// Minimal Apple-style toast with slide animation
const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-start gap-2 rounded-lg bg-white/90 backdrop-blur-md px-4 py-2 shadow-md border border-gray-200 text-gray-900 text-sm",
      "data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut",
      className
    )}
    style={{
      animationDuration: '0.3s',
      animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      animationFillMode: 'forwards',
    }}
    {...props}
  />
))
Toast.displayName = "Toast"

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("font-semibold text-sm leading-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-gray-600 leading-snug mt-0.5", className)}
    {...props}
  />
))
ToastDescription.displayName = "ToastDescription"

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute top-1 right-1 rounded-full p-1 text-gray-500 hover:text-gray-900 transition-colors",
      className
    )}
    {...props}
  >
    <X className="w-3.5 h-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = "ToastClose"

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
}
