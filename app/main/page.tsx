"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SyncStatus } from "@/components/sync-status"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Database, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useStorage } from "@/components/storage-provider"

export default function SyncPage() {
  const { isOnline, syncStatus, pendingChanges } = useStorage()

  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Data Sync</h2>
              <p className="text-muted-foreground">Manage your offline and online data synchronization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">Offline</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isOnline ? "Online" : "Offline"}</div>
              <p className="text-xs text-muted-foreground">
                {isOnline ? "Ready to sync data" : "Working in offline mode"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <RefreshCw
                className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin text-blue-600" : "text-muted-foreground"}`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{syncStatus}</div>
              <p className="text-xs text-muted-foreground">Current synchronization state</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
              <Database className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingChanges}</div>
              <p className="text-xs text-muted-foreground">Items waiting to sync</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Local Storage</CardTitle>
              <Database className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">Offline-first data storage</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          <SyncStatus />
          <Card>
            <CardHeader>
              <CardTitle>How Data Sync Works</CardTitle>
              <CardDescription>Understanding the offline-first architecture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  Offline-First Design
                </h4>
                <p className="text-sm text-muted-foreground">
                  All data is stored locally on your device first, ensuring the POS works even without internet
                  connection.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-green-600" />
                  Automatic Sync
                </h4>
                <p className="text-sm text-muted-foreground">
                  When you click sync, all unsynced data will be uploaded to the cloud database for backup and
                  multi-device access.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-orange-600" />
                  Data Types Synced
                </h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Inventory and stock levels</li>
                  <li>Customer information</li>
                  <li>Sales transactions</li>
                  <li>Purchase records</li>
                  <li>Returns and refunds</li>
                  <li>Bank transactions</li>
                  <li>Cash book entries</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
