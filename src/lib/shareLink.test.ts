import { describe, expect, it } from 'vitest'
import { defaultPlannerInputs, type Apartment, type PlannerInputs } from '../types'
import { decodePlannerState, encodePlannerState } from './shareLink'

const inputs: PlannerInputs = {
  ...defaultPlannerInputs,
  zipCode: '19103',
  bedrooms: 1,
  propertyType: 'apartment',
  grossIncome: 6200,
  takeHomePay: 4700,
  targetRent: 1650,
}

const apartments: Apartment[] = [
  {
    name: 'Test Flat',
    rent: 1600,
    utilities: 175,
    parking: 75,
    petFee: 0,
    depositMultiplier: 1,
    applicationFees: 100,
    commute: 120,
  },
]

describe('share link helpers', () => {
  it('encodes broad planner state without email or apartment names', () => {
    const encoded = encodePlannerState({ inputs, apartments })

    expect(encoded).toContain('zip=19103')
    expect(encoded).toContain('beds=1')
    expect(encoded).toContain('propertyType=apartment')
    expect(encoded).toContain('rent=1650')
    expect(encoded).not.toContain('Test%20Flat')
  })

  it('decodes known query parameters into typed planner state', () => {
    const decoded = decodePlannerState('?zip=19103&beds=2&propertyType=condo&rent=1800&gross=7000&takeHome=5100')

    expect(decoded).toMatchObject({
      zipCode: '19103',
      bedrooms: 2,
      propertyType: 'condo',
      targetRent: 1800,
      grossIncome: 7000,
      takeHomePay: 5100,
    })
  })
})
