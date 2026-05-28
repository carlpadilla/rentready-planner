export type PropertyType = 'apartment' | 'condo' | 'townhouse' | 'single-family'

export type Apartment = {
  name: string
  rent: number
  utilities: number
  parking: number
  petFee: number
  depositMultiplier: number
  applicationFees: number
  commute: number
}

export type PlannerInputs = {
  grossIncome: number
  takeHomePay: number
  debtPayments: number
  transportation: number
  subscriptions: number
  targetRent: number
  utilities: number
  rentersInsurance: number
  applicationFees: number
  depositMultiplier: number
  movingCost: number
  furnitureEssentials: number
  utilityDeposits: number
  emergencyCushion: number
  pets: boolean
  parking: boolean
  zipCode: string
  bedrooms: number
  propertyType: PropertyType
}

export type PlannerState = {
  inputs: PlannerInputs
  apartments: Apartment[]
}

export const defaultPlannerInputs: PlannerInputs = {
  grossIncome: 5200,
  takeHomePay: 4100,
  debtPayments: 450,
  transportation: 325,
  subscriptions: 125,
  targetRent: 1450,
  utilities: 225,
  rentersInsurance: 18,
  applicationFees: 150,
  depositMultiplier: 1,
  movingCost: 650,
  furnitureEssentials: 1200,
  utilityDeposits: 200,
  emergencyCushion: 1500,
  pets: false,
  parking: true,
  zipCode: '19103',
  bedrooms: 1,
  propertyType: 'apartment',
}

export const defaultApartments: Apartment[] = [
  {
    name: 'Riverside Studio',
    rent: 1395,
    utilities: 210,
    parking: 95,
    petFee: 0,
    depositMultiplier: 1,
    applicationFees: 125,
    commute: 160,
  },
  {
    name: 'Center City One Bed',
    rent: 1675,
    utilities: 180,
    parking: 0,
    petFee: 35,
    depositMultiplier: 1.5,
    applicationFees: 175,
    commute: 95,
  },
  {
    name: 'Suburban Loft',
    rent: 1290,
    utilities: 260,
    parking: 60,
    petFee: 25,
    depositMultiplier: 1,
    applicationFees: 100,
    commute: 240,
  },
]
