export type RecentActivityRecord = {
  id: string
  courseId: string
  courseTitle?: string | null
  materialKey: string
  materialId?: string | null
  materialType: string
  materialTitle: string
  action: 'view' | 'download'
  url: string
  occurredAt: string
  source: 'local' | 'server'
}

const STORAGE_KEY = 'energylogic_recent_activity'
const DISMISSED_KEY = 'energylogic_recent_activity_dismissed'
const MAX_ITEMS = 20

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

const loadDismissedIds = (): string[] => {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value) => typeof value === 'string')
  } catch (error) {
    console.warn('Не удалось прочитать отклонённые записи активности', error)
    return []
  }
}

const persistDismissedIds = (ids: string[]) => {
  if (!isBrowser()) return
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids))
  } catch (error) {
    console.warn('Не удалось сохранить отклонённые записи активности', error)
  }
}

export const markActivitiesDismissed = (ids: string[]) => {
  if (ids.length === 0) return
  const current = new Set(loadDismissedIds())
  ids.forEach((id) => {
    if (typeof id === 'string' && id.length > 0) {
      current.add(id)
    }
  })
  persistDismissedIds(Array.from(current))
}

export const clearRecentActivityStorage = () => {
  if (!isBrowser()) return
  localStorage.removeItem(STORAGE_KEY)
}

export const loadRecentActivity = (): RecentActivityRecord[] => {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentActivityRecord[]
    if (!Array.isArray(parsed)) return []
    const dismissedIds = new Set(loadDismissedIds())
    return parsed.filter((item) => !!item && typeof item === 'object' && !dismissedIds.has(item.id))
  } catch (error) {
    console.warn('Не удалось прочитать историю активности', error)
    return []
  }
}

const persistRecentActivity = (items: RecentActivityRecord[]) => {
  if (!isBrowser()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.warn('Не удалось сохранить историю активности', error)
  }
}

export const appendRecentActivity = (record: Omit<RecentActivityRecord, 'id' | 'source'> & { source?: 'local' | 'server'; id?: string }) => {
  if (!isBrowser()) return

  const items = loadRecentActivity()
  const resolvedId = record.id ?? `${record.materialKey}-${record.action}-${Date.now()}`
  const entry: RecentActivityRecord = {
    ...record,
    id: resolvedId,
    source: record.source ?? 'local'
  }

  const deduped = [entry, ...items.filter((item) => item.materialKey !== record.materialKey || item.action !== record.action)]
  persistRecentActivity(deduped.slice(0, MAX_ITEMS))
}

export const mergeWithLocalActivity = (incoming: RecentActivityRecord[]): RecentActivityRecord[] => {
  const local = loadRecentActivity()
  const dismissedIds = new Set(loadDismissedIds())
  const combined = [...incoming.filter((item) => !dismissedIds.has(item.id)), ...local]

  const byKey = new Map<string, RecentActivityRecord>()

  combined
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .forEach((item) => {
      const key = `${item.materialKey}-${item.action}`
      if (!byKey.has(key)) {
        byKey.set(key, item)
      }
    })

  return Array.from(byKey.values())
    .filter((item) => !dismissedIds.has(item.id))
    .slice(0, MAX_ITEMS)
}
