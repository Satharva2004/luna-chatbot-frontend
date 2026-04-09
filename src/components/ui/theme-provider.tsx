"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ReactNode } from "react"

type ThemeProviderProps = {
  children: ReactNode
  [key: string]: unknown
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
