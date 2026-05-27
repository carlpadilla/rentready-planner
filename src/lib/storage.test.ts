import { describe, expect, it, vi } from 'vitest'
import { defaultPlannerInputs, type Apartment, type PlannerInputs } from '../types'
import { loadSavedPlannerState, savePlannerState, storageKey } from './storage'

const inputs: PlannerInputs = {
  ...defaultPlannerInputs,
  zipCode: '19104',
  bedrooms: 2,
  propertyType: 'townhouse',
  targetRent: 1900,
}

const apartments: Apartment[] = [
  {
    name: 'Saved Option',
    rent: 1850,
    utilities: 210,
    parking: 50,
    petFee: 35,
    depositMultiplier: 1.5,
    applicationFees: 150,
    commute: 80,
  },
]

describe('planner storage', () => {
  it('round-trips versioned planner state in localStorage', () => {
    const storage = window.localStorage

    savePlannerState(storage, { inputs, apartments })
    const restored = loadSavedPlannerState(storage)

    expect(restored).toEqual({ inputs, apartments })
  })

  it('returns null for malformed saved state instead of throwing', () => {
    window.localStorage.setItem(storageKey, '{not valid json')

    expect(loadSavedPlannerState(window.localStorage)).toBeNull()
  })

  it('fails safely when storage writes are blocked', () => {
    const storage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    } satisfies Storage

    expect(() => savePlannerState(storage, { inputs, apartments })).not.toThrow()
  })
})
