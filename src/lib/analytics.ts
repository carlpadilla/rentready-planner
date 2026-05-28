type AnalyticsProvider = (eventName: string, metadata?: Record<string, string | number | boolean>) => void

type AnalyticsEventName =
  | 'calculator_updated'
  | 'comparison_updated'
  | 'planner_reset'
  | 'share_link_copied'
  | 'checklist_printed'
  | 'email_capture_submitted'

const allowedMetadataKeys = new Set(['zipCode', 'bedrooms', 'propertyType', 'risk'])

export function trackEvent(
  eventName: AnalyticsEventName,
  metadata: Record<string, unknown> = {},
  provider?: AnalyticsProvider,
) {
  if (!provider) return

  const sanitized = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) => allowedMetadataKeys.has(key) && ['string', 'number', 'boolean'].includes(typeof value),
    ),
  ) as Record<string, string | number | boolean>

  provider(eventName, sanitized)
}
