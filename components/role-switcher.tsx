"use client"

import { Button } from "@/components/ui/button"
import { useRole } from "./role-provider"
import { Shield, ShieldAlert } from "lucide-react"

const ADMIN_PERMISSIONS = [
  "user_management",
  "security_settings",
  "backup_restore",
  "system_config",
  "store_settings",
  "pos_access",
  "inventory_full",
  "customer_management",
  "sales_returns",
  "purchase_returns",
  "analytics_full",
  "delete_records",
]

const MANAGER_PERMISSIONS = [
  "store_settings",
  "pos_access",
  "inventory_view",
  "inventory_edit",
  "customer_management",
  "sales_returns",
  "purchase_returns",
  "analytics_view",
  "system_config_limited",
]

export function RoleSwitcher() {
  const { user, isAdmin } = useRole()

  const switchToAdmin = () => {
    console.log("RoleSwitcher disabled - Roles are now managed by Supabase Auth")
  }

  const switchToManager = () => {
    console.log("RoleSwitcher disabled - Roles are now managed by Supabase Auth")
  }

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <div className="text-sm font-medium mb-1">Role Tester</div>
      <Button
        variant={isAdmin() ? "default" : "outline"}
        size="sm"
        onClick={switchToAdmin}
        className="flex items-center gap-2"
      >
        <ShieldAlert size={16} />
        Admin
      </Button>
      <Button
        variant={!isAdmin() ? "default" : "outline"}
        size="sm"
        onClick={switchToManager}
        className="flex items-center gap-2"
      >
        <Shield size={16} />
        Manager
      </Button>
    </div>
  )
}
