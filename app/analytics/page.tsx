import type { Metadata } from "next"
import { AnalyticsClient } from "@/components/analytics-client"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  description: "Business analytics and insights",
}

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
          </div>
        </div>
      </div>
      <AnalyticsClient />
    </div>
  )
}
