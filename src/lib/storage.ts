import type { PlannerState } from '../types'

export const storageKey = 'rentready-planner:v1'

type PersistedPlannerState = PlannerState & {
  version: 1
  savedAt: string
}

function isPlannerState(value: unknown): value is PersistedPlannerState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PersistedPlannerState>
  return candidate.version === 1 && Boolean(candidate.inputs) && Array.isArray(candidate.apartments)
}

export function loadSavedPlannerState(storage: Storage = window.localStorage): PlannerState | null {
  try {
    const raw = storage.getItem(storageKey)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isPlannerState(parsed)) return null

    return {
      inputs: parsed.inputs,
      apartments: parsed.apartments,
    }
  } catch {
    return null
  }
}

export function savePlannerState(storage: Storage = window.localStorage, state: PlannerState) {
  try {
    const payload: PersistedPlannerState = {
      version: 1,
      savedAt: new Date().toISOString(),
      ...state,
    }
    storage.setItem(storageKey, JSON.stringify(payload))
  } catch {
    // Browser storage can be disabled or full. The app should keep working.
  }
}

export function clearPlannerState(storage: Storage = window.localStorage) {
  try {
    storage.removeItem(storageKey)
  } catch {
    // Nothing useful to do here. Silence is the correct fallback.
  }
}
