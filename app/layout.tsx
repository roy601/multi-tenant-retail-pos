import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { StorageProvider } from "@/components/storage-provider"
import { RoleProvider } from "@/components/role-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mobile POS - Point of Sale System",
  description: "Complete mobile point of sale system for retail businesses",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
          <RoleProvider>
            <StorageProvider>
              {children}
              <Toaster />
            </StorageProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}