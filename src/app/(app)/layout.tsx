import ProtectedRoute from "@/components/auth/protected-route"
import { ConversationsProvider } from "@/contexts/conversations-context"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { CommandPalette } from "@/components/shell/command-palette"
import { DynamicBreadcrumb } from "@/components/shell/dynamic-breadcrumb"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <ConversationsProvider>
        <SidebarProvider className="h-svh min-h-svh overflow-hidden">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-auto"
              />
              <DynamicBreadcrumb />
              <div className="ml-auto flex items-center gap-2">
                <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
                <ThemeToggle />
              </div>
            </header>
            <CommandPalette />
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </ConversationsProvider>
    </ProtectedRoute>
  )
}
