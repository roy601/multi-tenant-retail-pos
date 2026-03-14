export interface SyncStats {
  total: number
  synced: number
  unsynced: number
}

export interface StorageItem {
  id: string
  type: string
  data: any
  synced: boolean
  createdAt: Date
  updatedAt: Date
}

export class LocalStorage {
  private static instance: LocalStorage
  private storageKey = "mobilepos_data"

  static getInstance(): LocalStorage {
    if (!LocalStorage.instance) {
      LocalStorage.instance = new LocalStorage()
    }
    return LocalStorage.instance
  }

  private getStorageData(): StorageItem[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      return []
    }
  }

  private setStorageData(data: StorageItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error("Error writing to localStorage:", error)
    }
  }

  save(type: string, data: any): string {
    const items = this.getStorageData()
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const newItem: StorageItem = {
      id,
      type,
      data,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    items.push(newItem)
    this.setStorageData(items)
    return id
  }

  update(id: string, data: any): boolean {
    const items = this.getStorageData()
    const index = items.findIndex((item) => item.id === id)

    if (index !== -1) {
      items[index].data = data
      items[index].updatedAt = new Date()
      items[index].synced = false
      this.setStorageData(items)
      return true
    }
    return false
  }

  delete(id: string): boolean {
    const items = this.getStorageData()
    const filteredItems = items.filter((item) => item.id !== id)

    if (filteredItems.length !== items.length) {
      this.setStorageData(filteredItems)
      return true
    }
    return false
  }

  getAll(type?: string): StorageItem[] {
    const items = this.getStorageData()
    return type ? items.filter((item) => item.type === type) : items
  }

  getById(id: string): StorageItem | null {
    const items = this.getStorageData()
    return items.find((item) => item.id === id) || null
  }

  getUnsynced(): StorageItem[] {
    const items = this.getStorageData()
    return items.filter((item) => !item.synced)
  }

  markAsSynced(id: string): boolean {
    const items = this.getStorageData()
    const index = items.findIndex((item) => item.id === id)

    if (index !== -1) {
      items[index].synced = true
      this.setStorageData(items)
      return true
    }
    return false
  }

  getSyncStats(): SyncStats {
    const items = this.getStorageData()
    const total = items.length
    const synced = items.filter((item) => item.synced).length
    const unsynced = total - synced

    return { total, synced, unsynced }
  }

  clear(): void {
    localStorage.removeItem(this.storageKey)
  }

  clearSynced(): void {
    const items = this.getStorageData()
    const unsyncedItems = items.filter((item) => !item.synced)
    this.setStorageData(unsyncedItems)
  }
}
