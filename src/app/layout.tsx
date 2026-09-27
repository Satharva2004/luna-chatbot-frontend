import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Silkscreen } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { AnimationProvider } from "@/components/ui/animation-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
});

export const metadata: Metadata = {
  title: "Luna AI — Research Dashboard",
  description: "Luna AI research assistant with a fintech-grade dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${silkscreen.variable} ${playfair.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnimationProvider>
            <TooltipProvider>
              <AuthProvider>
                {children}
                <Toaster position="top-center" richColors />
                <Analytics />
              </AuthProvider>
            </TooltipProvider>
          </AnimationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
