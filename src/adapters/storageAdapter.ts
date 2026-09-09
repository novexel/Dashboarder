import type { DashboardConfig, DataSource } from '../core/types'

export interface DashboardStorageAdapter {
  save(storageKey: string, payload: { config: DashboardConfig; dataSources: DataSource[] }): Promise<void> | void
  load(storageKey: string): Promise<{ config: DashboardConfig; dataSources: DataSource[] } | null> | { config: DashboardConfig; dataSources: DataSource[] } | null
}

const STORAGE_VERSION = '1'

export type PersistedDashboardState = {
  version: string
  savedAt: string
  config: DashboardConfig
  dataSources: DataSource[]
}

/**
 * LocalStorage reference implementation of DashboardStorageAdapter
 */
export class LocalStorageDashboardAdapter implements DashboardStorageAdapter {
  save(storageKey: string, payload: { config: DashboardConfig; dataSources: DataSource[] }): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    const value: PersistedDashboardState = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      ...payload,
    }

    window.localStorage.setItem(storageKey, JSON.stringify(value))
  }

  load(storageKey: string): { config: DashboardConfig; dataSources: DataSource[] } | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) {
      return null
    }

    try {
      const parsed = JSON.parse(rawValue) as PersistedDashboardState
      return {
        config: parsed.config,
        dataSources: parsed.dataSources ?? [],
      }
    } catch {
      return null
    }
  }
}

export const defaultStorageAdapter = new LocalStorageDashboardAdapter()

export const saveDashboardState = (storageKey: string, payload: { config: DashboardConfig; dataSources: DataSource[] }) =>
  defaultStorageAdapter.save(storageKey, payload)

export const loadDashboardState = (storageKey: string) =>
  defaultStorageAdapter.load(storageKey)
