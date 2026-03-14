import type { Metadata } from "next"
import { SettingsClient } from "@/components/settings-client"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"

export const metadata: Metadata = {
  title: "Settings",
  description: "System settings and user management",
}

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>
      <SettingsClient />
    </div>
  )
}
