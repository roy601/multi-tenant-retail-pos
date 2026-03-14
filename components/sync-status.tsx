"use client"

import { useState, useEffect } from "react"
import { Cloud, Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { LocalStorage } from "@/lib/storage"
import { SyncService, type SyncResult } from "@/lib/sync-service"

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState({ total: 0, synced: 0, unsynced: 0 })
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState(0)
  const { toast } = useToast()

  const storage = LocalStorage.getInstance()
  const syncService = SyncService.getInstance()

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    // Load sync stats
    loadSyncStats()

    // Load last sync time
    const lastSync = localStorage.getItem("last_sync_time")
    if (lastSync) {
      setLastSyncTime(lastSync)
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [])

  const loadSyncStats = () => {
    const stats = storage.getSyncStats()
    setSyncStats(stats)
  }

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)
    setSyncProgress(0)

    try {
      // Check server connection first
      const isConnected = await syncService.checkConnection()
      if (!isConnected) {
        throw new Error("Cannot connect to server")
      }

      setSyncProgress(25)

      // Perform sync
      const result: SyncResult = await syncService.syncToServer()

      setSyncProgress(75)

      // Update stats
      loadSyncStats()

      setSyncProgress(100)

      // Update last sync time
      const now = new Date().toISOString()
      setLastSyncTime(now)
      localStorage.setItem("last_sync_time", now)

      if (result.success) {
        toast({
          title: "Sync Successful",
          description: `${result.syncedCount} items synced successfully.`,
        })
      } else {
        toast({
          title: "Sync Partially Failed",
          description: `${result.syncedCount} items synced, ${result.failedCount} failed.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
      setSyncProgress(0)
    }
  }

  const formatLastSyncTime = (time: string | null) => {
    if (!time) return "Never"
    const date = new Date(time)
    return date.toLocaleString()
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Data Sync Control</CardTitle>
              <CardDescription>Manage your data synchronization</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="secondary" className="gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Progress */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Syncing data...</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        {/* Sync Statistics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">{syncStats.total}</div>
            <div className="text-xs text-muted-foreground">Total Records</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{syncStats.synced}</div>
            <div className="text-xs text-muted-foreground">Synced</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-orange-600">{syncStats.unsynced}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Last Sync Time */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Last sync:</span>
          <span>{formatLastSyncTime(lastSyncTime)}</span>
        </div>

        {/* Sync Button */}
        <Button onClick={handleSync} disabled={isSyncing || !isOnline} className="w-full" size="lg">
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : syncStats.unsynced > 0 ? (
            <>
              <Cloud className="mr-2 h-4 w-4" />
              Sync {syncStats.unsynced} Items
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              All Data Synced
            </>
          )}
        </Button>

        {/* Sync Status Indicators */}
        <div className="flex items-center justify-center gap-4 text-xs">
          {syncStats.unsynced > 0 ? (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertCircle className="h-3 w-3" />
              {syncStats.unsynced} items need sync
            </div>
          ) : (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              All data synchronized
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
