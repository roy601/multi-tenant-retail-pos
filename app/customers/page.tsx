import type { Metadata } from "next"
import { CustomerClient } from "@/components/customer-client"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"

export const metadata: Metadata = {
  title: "Customer Management",
  description: "Customer management for mobile selling shops",
}

export default function CustomersPage() {
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
      <CustomerClient />
    </div>
  )
}
