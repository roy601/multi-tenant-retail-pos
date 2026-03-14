import { LocalStorage, type StorageItem } from "./storage"

export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: string[]
}

export class SyncService {
  private static instance: SyncService
  private storage: LocalStorage
  private serverUrl = "https://api.mobilepos.com" // Replace with your actual server URL

  constructor() {
    this.storage = LocalStorage.getInstance()
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Simulate server connection check
      await new Promise((resolve) => setTimeout(resolve, 500))
      return navigator.onLine
    } catch (error) {
      console.error("Connection check failed:", error)
      return false
    }
  }

  async syncToServer(): Promise<SyncResult> {
    const unsyncedItems = this.storage.getUnsynced()
    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const item of unsyncedItems) {
      try {
        await this.syncItem(item)
        this.storage.markAsSynced(item.id)
        syncedCount++
      } catch (error) {
        failedCount++
        errors.push(`Failed to sync ${item.type} ${item.id}: ${error}`)
        console.error(`Sync failed for item ${item.id}:`, error)
      }
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors,
    }
  }

  private async syncItem(item: StorageItem): Promise<void> {
    // Simulate API call to sync individual item
    await new Promise((resolve) => setTimeout(resolve, 100))

    // In a real implementation, you would make HTTP requests here
    // Example:
    // const response = await fetch(`${this.serverUrl}/${item.type}`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(item.data)
    // })
    //
    // if (!response.ok) {
    //   throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    // }

    // For demo purposes, we'll just simulate success
    console.log(`Synced ${item.type} item:`, item.data)
  }

  async syncFromServer(): Promise<SyncResult> {
    try {
      // Simulate fetching data from server
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // In a real implementation, you would fetch data from your server
      // and update local storage accordingly

      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: [],
      }
    } catch (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 1,
        errors: [`Failed to sync from server: ${error}`],
      }
    }
  }

  async fullSync(): Promise<SyncResult> {
    // First sync to server, then sync from server
    const uploadResult = await this.syncToServer()
    const downloadResult = await this.syncFromServer()

    return {
      success: uploadResult.success && downloadResult.success,
      syncedCount: uploadResult.syncedCount + downloadResult.syncedCount,
      failedCount: uploadResult.failedCount + downloadResult.failedCount,
      errors: [...uploadResult.errors, ...downloadResult.errors],
    }
  }
}
