import { describe, expect, it, vi } from 'vitest'
import { trackEvent } from './analytics'

describe('analytics event stub', () => {
  it('emits sanitized event names and metadata when a provider is present', () => {
    const provider = vi.fn()

    trackEvent('share_link_copied', { zipCode: '19103', bedrooms: 1, rent: 1650, email: 'person@example.com' }, provider)

    expect(provider).toHaveBeenCalledWith('share_link_copied', {
      zipCode: '19103',
      bedrooms: 1,
    })
  })

  it('does nothing when no analytics provider is configured', () => {
    expect(() => trackEvent('checklist_printed', { rent: 1500 })).not.toThrow()
  })
})
