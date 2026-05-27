import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { trackEvent } from './lib/analytics'
import { buildShareUrl, decodePlannerState } from './lib/shareLink'
import { clearPlannerState, loadSavedPlannerState, savePlannerState } from './lib/storage'
import { defaultApartments, defaultPlannerInputs, type Apartment, type PlannerInputs, type PropertyType } from './types'

type RiskLevel = 'comfortable' | 'tight' | 'risky'

type ShareStatus = 'idle' | 'copied' | 'failed'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const seoQuestions = [
  {
    question: 'How much rent can I afford?',
    answer:
      'Start with 25–30% of gross income, then adjust for debt, transportation, utilities, savings, and emergency cash. The calculator uses your actual monthly obligations instead of pretending rent is the only bill in the room.',
  },
  {
    question: 'How much cash do I need before moving into an apartment?',
    answer:
      'Plan for application fees, security deposit, first month of rent, moving costs, furniture essentials, utility deposits, and an emergency cushion. The exact number is deeply inconvenient, which is why calculating it before applying is wise.',
  },
  {
    question: 'Is the 30% rent rule enough?',
    answer:
      'No. It is a starting point, not a personality. High debt payments, a car loan, expensive utilities, or a thin emergency fund can make a 30% rent ratio risky.',
  },
]

function App() {
  const savedState = typeof window !== 'undefined' ? loadSavedPlannerState() : null
  const urlState = typeof window !== 'undefined' ? decodePlannerState(window.location.search) : {}
  const [inputs, setInputs] = useState<PlannerInputs>({
    ...defaultPlannerInputs,
    ...savedState?.inputs,
    ...urlState,
  })
  const [apartments, setApartments] = useState<Apartment[]>(savedState?.apartments ?? defaultApartments)
  const [email, setEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle')

  const results = useMemo(() => {
    const monthlyHousing =
      inputs.targetRent + inputs.utilities + inputs.rentersInsurance + (inputs.parking ? 95 : 0) + (inputs.pets ? 35 : 0)
    const monthlyCommitted =
      monthlyHousing + inputs.debtPayments + inputs.transportation + inputs.subscriptions
    const leftover = inputs.takeHomePay - monthlyCommitted
    const rentToGross = inputs.targetRent / Math.max(inputs.grossIncome, 1)
    const housingToTakeHome = monthlyHousing / Math.max(inputs.takeHomePay, 1)
    const moveInCash =
      inputs.targetRent +
      inputs.targetRent * inputs.depositMultiplier +
      inputs.applicationFees +
      inputs.movingCost +
      inputs.furnitureEssentials +
      inputs.utilityDeposits +
      inputs.emergencyCushion
    const recommendedMaxRent = Math.max(
      0,
      Math.min(inputs.grossIncome * 0.3, (inputs.takeHomePay - inputs.debtPayments - inputs.transportation - inputs.subscriptions - 700) * 0.55),
    )

    let risk: RiskLevel = 'comfortable'
    if (rentToGross > 0.34 || housingToTakeHome > 0.45 || leftover < 500) risk = 'risky'
    else if (rentToGross > 0.3 || housingToTakeHome > 0.38 || leftover < 900) risk = 'tight'

    const warnings = [
      rentToGross > 0.3 ? 'Target rent is above 30% of gross income.' : '',
      housingToTakeHome > 0.4 ? 'Housing costs consume more than 40% of take-home pay.' : '',
      leftover < inputs.emergencyCushion / 2 ? 'Monthly leftover is thin compared with your emergency cushion goal.' : '',
      inputs.utilities === 0 ? 'Utilities are missing. Landlords have a remarkable talent for not paying those for you.' : '',
      inputs.depositMultiplier < 1 ? 'Deposit assumption is below one month of rent. Verify this before applying.' : '',
    ].filter(Boolean)

    return {
      monthlyHousing,
      monthlyCommitted,
      leftover,
      rentToGross,
      housingToTakeHome,
      moveInCash,
      recommendedMaxRent,
      risk,
      warnings,
    }
  }, [inputs])

  const apartmentScores = useMemo(
    () =>
      apartments.map((apartment) => {
        const monthlyTotal =
          apartment.rent + apartment.utilities + apartment.parking + apartment.petFee + apartment.commute + inputs.rentersInsurance
        const firstYearCost = monthlyTotal * 12 + apartment.rent * apartment.depositMultiplier + apartment.applicationFees
        const cashNeeded = apartment.rent + apartment.rent * apartment.depositMultiplier + apartment.applicationFees
        const ratio = monthlyTotal / Math.max(inputs.takeHomePay, 1)
        const verdict = ratio < 0.38 ? 'Strong fit' : ratio < 0.45 ? 'Watch carefully' : 'Risky fit'

        return { ...apartment, monthlyTotal, firstYearCost, cashNeeded, ratio, verdict }
      }),
    [apartments, inputs.rentersInsurance, inputs.takeHomePay],
  )

  const checklist = useMemo(() => {
    const items = [
      'Verify income requirements and whether gross or net income is used.',
      'Confirm total move-in cash: deposit, first month, application/admin fees, utility deposits, and insurance.',
      'Ask which utilities are included and request average monthly ranges.',
      'Read lease rules for parking, pets, guests, subletting, renewals, and early termination.',
      'Photograph the unit before move-in and document existing damage.',
      'Price internet setup, renters insurance, furniture essentials, and moving supplies before signing.',
    ]

    if (inputs.pets) items.push('Confirm pet rent, pet deposit, breed rules, and cleaning fees in writing.')
    if (inputs.parking) items.push('Confirm parking cost, assigned space details, towing rules, and guest parking limits.')
    if (results.risk !== 'comfortable') items.push('Build a cheaper backup option before submitting application fees.')
    if (results.moveInCash > inputs.takeHomePay) items.push('Do not drain the entire checking account on move-in day. Drama is not a budgeting strategy.')

    return items
  }, [inputs.parking, inputs.pets, inputs.takeHomePay, results.moveInCash, results.risk])

  useEffect(() => {
    savePlannerState(undefined, { inputs, apartments })
  }, [inputs, apartments])

  const updateInput = (key: keyof PlannerInputs, value: number | string | boolean) => {
    setInputs((current) => ({ ...current, [key]: value }))
    setShareStatus('idle')
    trackEvent('calculator_updated', {
      zipCode: key === 'zipCode' ? String(value) : inputs.zipCode,
      bedrooms: key === 'bedrooms' && typeof value === 'number' ? value : inputs.bedrooms,
      propertyType: key === 'propertyType' ? String(value) : inputs.propertyType,
      risk: results.risk,
    })
  }

  const updateApartment = (index: number, key: keyof Apartment, value: number | string) => {
    setApartments((current) =>
      current.map((apartment, apartmentIndex) =>
        apartmentIndex === index ? { ...apartment, [key]: value } : apartment,
      ),
    )
    trackEvent('comparison_updated', { zipCode: inputs.zipCode, bedrooms: inputs.bedrooms, propertyType: inputs.propertyType })
  }

  const resetPlanner = () => {
    clearPlannerState()
    setInputs(defaultPlannerInputs)
    setApartments(defaultApartments)
    setShareStatus('idle')
    trackEvent('planner_reset')
  }

  const copyShareLink = async () => {
    const shareUrl = buildShareUrl({ inputs, apartments })

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareStatus('copied')
      trackEvent('share_link_copied', { zipCode: inputs.zipCode, bedrooms: inputs.bedrooms, propertyType: inputs.propertyType })
    } catch {
      setShareStatus('failed')
    }
  }

  const printChecklist = () => {
    trackEvent('checklist_printed', { zipCode: inputs.zipCode, bedrooms: inputs.bedrooms, propertyType: inputs.propertyType })
    window.print()
  }

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    setEmailSaved(true)
    trackEvent('email_capture_submitted', { zipCode: inputs.zipCode, bedrooms: inputs.bedrooms, propertyType: inputs.propertyType })
  }

  return (
    <main>
      <section className="hero-section" id="calculator">
        <nav className="top-nav" aria-label="Primary navigation">
          <a href="#calculator" className="brand">RentReady Planner</a>
          <div>
            <a href="#compare">Compare</a>
            <a href="#checklist">Checklist</a>
            <a href="#guides">Guides</a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">First apartment cost calculator</p>
            <h1>Know if you can afford the apartment before the fees start bleeding you.</h1>
            <p className="hero-text">
              Estimate your rent comfort zone, move-in cash requirement, monthly leftover, and signing checklist in one focused planning session.
            </p>
            <div className="hero-actions">
              <a href="#planner" className="button primary">Run the planner</a>
              <a href="#guides" className="button secondary">Read the assumptions</a>
            </div>
          </div>

          <aside className={`result-card ${results.risk}`} aria-label="Affordability result summary">
            <span className="status-pill">{results.risk}</span>
            <h2>{currency.format(results.moveInCash)}</h2>
            <p>Estimated cash needed before move-in.</p>
            <div className="metric-row">
              <span>Recommended max rent</span>
              <strong>{currency.format(results.recommendedMaxRent)}</strong>
            </div>
            <div className="metric-row">
              <span>Monthly leftover</span>
              <strong>{currency.format(results.leftover)}</strong>
            </div>
            <div className="metric-row">
              <span>Rent / gross income</span>
              <strong>{percent.format(results.rentToGross)}</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="planner-grid" id="planner">
        <form className="panel inputs-panel" aria-label="Rent affordability inputs">
          <div className="section-heading">
            <p className="eyebrow">Planner inputs</p>
            <h2>Monthly reality check</h2>
          </div>

          <div className="location-grid">
            <label>
              ZIP code
              <input
                inputMode="numeric"
                maxLength={5}
                value={inputs.zipCode}
                onChange={(event) => updateInput('zipCode', event.target.value.replace(/\D/g, '').slice(0, 5))}
              />
            </label>
            <NumberField label="Bedrooms" value={inputs.bedrooms} onChange={(value) => updateInput('bedrooms', value)} step="1" />
            <label>
              Property type
              <select value={inputs.propertyType} onChange={(event) => updateInput('propertyType', event.target.value as PropertyType)}>
                <option value="apartment">Apartment</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="single-family">Single-family</option>
              </select>
            </label>
          </div>

          <div className="input-grid">
            <NumberField label="Gross monthly income" value={inputs.grossIncome} onChange={(value) => updateInput('grossIncome', value)} />
            <NumberField label="Take-home pay" value={inputs.takeHomePay} onChange={(value) => updateInput('takeHomePay', value)} />
            <NumberField label="Target rent" value={inputs.targetRent} onChange={(value) => updateInput('targetRent', value)} />
            <NumberField label="Monthly debt payments" value={inputs.debtPayments} onChange={(value) => updateInput('debtPayments', value)} />
            <NumberField label="Transportation" value={inputs.transportation} onChange={(value) => updateInput('transportation', value)} />
            <NumberField label="Utilities" value={inputs.utilities} onChange={(value) => updateInput('utilities', value)} />
            <NumberField label="Renters insurance" value={inputs.rentersInsurance} onChange={(value) => updateInput('rentersInsurance', value)} />
            <NumberField label="Application/admin fees" value={inputs.applicationFees} onChange={(value) => updateInput('applicationFees', value)} />
            <NumberField label="Security deposit months" value={inputs.depositMultiplier} onChange={(value) => updateInput('depositMultiplier', value)} step="0.5" />
            <NumberField label="Moving cost" value={inputs.movingCost} onChange={(value) => updateInput('movingCost', value)} />
            <NumberField label="Furniture essentials" value={inputs.furnitureEssentials} onChange={(value) => updateInput('furnitureEssentials', value)} />
            <NumberField label="Emergency cushion" value={inputs.emergencyCushion} onChange={(value) => updateInput('emergencyCushion', value)} />
          </div>

          <div className="toggles">
            <label>
              <input type="checkbox" checked={inputs.parking} onChange={(event) => updateInput('parking', event.target.checked)} />
              Include parking estimate
            </label>
            <label>
              <input type="checkbox" checked={inputs.pets} onChange={(event) => updateInput('pets', event.target.checked)} />
              Include pet rent estimate
            </label>
          </div>

          <div className="planner-actions">
            <button type="button" className="button primary" onClick={copyShareLink}>Copy share link</button>
            <button type="button" className="button secondary" onClick={resetPlanner}>Reset saved plan</button>
          </div>
          <p className="privacy-note">
            Your plan is saved in this browser only. Share links include broad calculator values, not your email or apartment names.
          </p>
          {shareStatus === 'copied' && <span className="saved-message">Share link copied.</span>}
          {shareStatus === 'failed' && <span className="warning-inline">Could not access clipboard. Copy from the address bar after changing values.</span>}
        </form>

        <section className="panel output-panel" aria-live="polite">
          <div className="section-heading">
            <p className="eyebrow">Your result</p>
            <h2>{results.risk === 'comfortable' ? 'Comfortable fit' : results.risk === 'tight' ? 'Tight, but possible' : 'Risky lease'}</h2>
          </div>

          <div className="score-ring" aria-label={`Housing consumes ${percent.format(results.housingToTakeHome)} of take-home pay`}>
            <span>{percent.format(results.housingToTakeHome)}</span>
            <small>of take-home pay</small>
          </div>

          <div className="summary-cards">
            <Metric label="Monthly housing" value={currency.format(results.monthlyHousing)} />
            <Metric label="Committed monthly costs" value={currency.format(results.monthlyCommitted)} />
            <Metric label="Move-in cash target" value={currency.format(results.moveInCash)} />
          </div>

          {results.warnings.length > 0 ? (
            <div className="warning-box">
              <strong>Watch these before applying:</strong>
              <ul>
                {results.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : (
            <div className="success-box">The numbers look survivable. Still read the lease; optimism is not a control.</div>
          )}
        </section>
      </section>

      <section className="comparison-section" id="compare">
        <div className="section-heading centered">
          <p className="eyebrow">Apartment comparison worksheet</p>
          <h2>Compare up to three options by monthly and first-year cost.</h2>
        </div>

        <div className="apartment-grid">
          {apartmentScores.map((apartment, index) => (
            <article className="apartment-card" key={index}>
              <label>
                Apartment name
                <input value={apartment.name} onChange={(event) => updateApartment(index, 'name', event.target.value)} />
              </label>
              <div className="mini-grid">
                <NumberField label="Rent" value={apartment.rent} onChange={(value) => updateApartment(index, 'rent', value)} compact />
                <NumberField label="Utilities" value={apartment.utilities} onChange={(value) => updateApartment(index, 'utilities', value)} compact />
                <NumberField label="Parking" value={apartment.parking} onChange={(value) => updateApartment(index, 'parking', value)} compact />
                <NumberField label="Commute" value={apartment.commute} onChange={(value) => updateApartment(index, 'commute', value)} compact />
              </div>
              <div className="apartment-result">
                <span>{apartment.verdict}</span>
                <strong>{currency.format(apartment.monthlyTotal)} / mo</strong>
                <small>{currency.format(apartment.firstYearCost)} estimated first-year cost</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="checklist-section" id="checklist">
        <div className="panel checklist-panel">
          <div className="section-heading">
            <p className="eyebrow">Personalized checklist</p>
            <h2>Before you sign</h2>
          </div>
          <ol>
            {checklist.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <button type="button" className="button primary print-button" onClick={printChecklist}>Print checklist</button>
        </div>

        <form className="panel email-panel" onSubmit={handleEmailSubmit}>
          <p className="eyebrow">MVP email capture</p>
          <h2>Save the checklist</h2>
          <p>For launch, connect this form to ConvertKit, Beehiiv, MailerLite, or a small serverless endpoint.</p>
          <div className="email-row">
            <input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            <button type="submit">Save</button>
          </div>
          {emailSaved && <span className="saved-message">Checklist saved locally for this demo. Backend integration is next.</span>}
        </form>
      </section>

      <section className="guides-section" id="guides">
        <div className="section-heading centered">
          <p className="eyebrow">SEO-ready guide blocks</p>
          <h2>Useful content around the calculator, not decoration.</h2>
        </div>
        <div className="faq-grid">
          {seoQuestions.map((item) => (
            <article className="faq-card" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = '25',
  compact = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: string
  compact?: boolean
}) {
  return (
    <label className={compact ? 'number-field compact' : 'number-field'}>
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min="0"
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App

