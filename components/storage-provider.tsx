"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { LocalStorage } from "@/lib/storage"
import { SyncService } from "@/lib/sync-service"

type StorageContextType = {
  storage: LocalStorage
  syncService: SyncService
  isOnline: boolean
  syncStatus: "idle" | "syncing" | "error"
  lastSync: Date | null
  pendingChanges: number
}

const StorageContext = createContext<StorageContextType | undefined>(undefined)

export function StorageProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle")
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [pendingChanges, setPendingChanges] = useState(0)

  const storage = LocalStorage.getInstance()
  const syncService = SyncService.getInstance()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Load initial sync stats
    const stats = storage.getSyncStats()
    setPendingChanges(stats.unsynced)

    // Load last sync time
    const lastSyncTime = localStorage.getItem("last_sync_time")
    if (lastSyncTime) {
      setLastSync(new Date(lastSyncTime))
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [storage])

  return (
    <StorageContext.Provider
      value={{
        storage,
        syncService,
        isOnline,
        syncStatus,
        lastSync,
        pendingChanges,
      }}
    >
      {children}
    </StorageContext.Provider>
  )
}

export function useStorage() {
  const context = useContext(StorageContext)
  if (context === undefined) {
    throw new Error("useStorage must be used within a StorageProvider")
  }
  return context
}
