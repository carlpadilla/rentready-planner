import type { Apartment, PlannerInputs, PlannerState, PropertyType } from '../types'

const allowedPropertyTypes = new Set<PropertyType>(['apartment', 'condo', 'townhouse', 'single-family'])

const readNumber = (params: URLSearchParams, key: string) => {
  const value = Number(params.get(key))
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

export function encodePlannerState({ inputs }: PlannerState) {
  const params = new URLSearchParams()

  params.set('zip', inputs.zipCode)
  params.set('beds', String(inputs.bedrooms))
  params.set('propertyType', inputs.propertyType)
  params.set('rent', String(inputs.targetRent))
  params.set('gross', String(inputs.grossIncome))
  params.set('takeHome', String(inputs.takeHomePay))
  params.set('debt', String(inputs.debtPayments))
  params.set('transport', String(inputs.transportation))
  params.set('utilities', String(inputs.utilities))
  params.set('parking', inputs.parking ? '1' : '0')
  params.set('pets', inputs.pets ? '1' : '0')

  return params.toString()
}

export function decodePlannerState(search: string): Partial<PlannerInputs> {
  const params = new URLSearchParams(search)
  const propertyType = params.get('propertyType')
  const decoded: Partial<PlannerInputs> = {}

  const zip = params.get('zip')?.trim()
  if (zip && /^\d{5}$/.test(zip)) decoded.zipCode = zip

  const bedrooms = readNumber(params, 'beds')
  if (bedrooms !== undefined) decoded.bedrooms = bedrooms

  if (propertyType && allowedPropertyTypes.has(propertyType as PropertyType)) {
    decoded.propertyType = propertyType as PropertyType
  }

  const numericMap: Array<[keyof PlannerInputs, string]> = [
    ['targetRent', 'rent'],
    ['grossIncome', 'gross'],
    ['takeHomePay', 'takeHome'],
    ['debtPayments', 'debt'],
    ['transportation', 'transport'],
    ['utilities', 'utilities'],
  ]

  numericMap.forEach(([field, key]) => {
    const value = readNumber(params, key)
    if (value !== undefined) decoded[field] = value as never
  })

  if (params.has('parking')) decoded.parking = params.get('parking') === '1'
  if (params.has('pets')) decoded.pets = params.get('pets') === '1'

  return decoded
}

export function buildShareUrl(state: PlannerState, baseUrl = window.location.href) {
  const url = new URL(baseUrl)
  url.search = encodePlannerState(state)
  url.hash = 'calculator'
  return url.toString()
}

export function summarizeApartmentsForShare(apartments: Apartment[]) {
  return apartments.map(({ rent, utilities, parking, petFee, commute }) => ({ rent, utilities, parking, petFee, commute }))
}
