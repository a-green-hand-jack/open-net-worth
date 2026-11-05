import { useAppIntl } from '../../../i18n/useAppIntl'
// What to do once a connector has a linked account: linking imports nothing, so say so, and offer
// the one step that brings transactions in — the connector's sync Automation (as a draft the user
// reviews, on the template's own schedule) — or the sentence to ask Lucius for a one-off fetch.
import { useRouter } from '@tanstack/react-router'
import { Button, Text } from '../../ui'
import { ALL_TEMPLATES, templateKeyForConnector } from '../automations/automationTemplates'

/** "every 6 hours" / "every hour" — the template's own interval, so the copy can't drift. */
function cadence(templateKey: string | null): number | null {
  const trigger = ALL_TEMPLATES.find((t) => t.key === templateKey)?.trigger
  if (!trigger || trigger.kind !== 'schedule' || trigger.type !== 'interval') return null
  const hours = Math.round((trigger.seconds ?? 0) / 3600)
  if (hours < 1) return null
  return hours
}

export function ConnectorNextStep({
  provider,
  providerLabel,
  linkedCount,
  unlinkedCount,
  bare = false,
}: {
  provider: string
  providerLabel: string
  linkedCount: number
  unlinkedCount: number
  /** Inside a setup step that supplies its own frame and title — render the body only. */
  bare?: boolean
}) {
  const { formatMessage } = useAppIntl()
  // Optional: these forms also render outside the router (tests, previews).
  const router = useRouter({ warn: false }) as ReturnType<typeof useRouter> | undefined
  const templateKey = templateKeyForConnector(provider)
  if (linkedCount === 0) return null
  const every = cadence(templateKey)
  const target = formatMessage({ id: 'connectors.next.target', defaultMessage: 'your linked {count, plural, one {account} other {accounts}}' }, { count: linkedCount })
  const frequency = every ? formatMessage({ id: 'connectors.next.cadence', defaultMessage: 'every {hours, plural, one {hour} other {{hours} hours}}' }, { hours: every }) : ''

  const openTemplate = () => {
    if (!templateKey) return
    if (router)
      void router.navigate({ to: '/automations', search: { template: templateKey } as never })
    else window.location.assign(`/automations?template=${encodeURIComponent(templateKey)}`)
  }

  const body = (
    <>
      <Text size="xs" tone="muted">
        {formatMessage({ id: 'connectors.next.intro', defaultMessage: "Linking doesn't import anything yet." })}{' '}
        {templateKey ? formatMessage({ id: 'connectors.next.automation', defaultMessage: 'Set up an automation and Lucius will add new transactions from {provider} to {target}{cadence}.' }, { provider: providerLabel, target, cadence: frequency ? ` ${frequency}` : '' }) : formatMessage({ id: 'connectors.next.ask', defaultMessage: 'Ask Lucius to add transactions from {provider} to {target}.' }, { provider: providerLabel, target })}
        {unlinkedCount > 0 && formatMessage({ id: 'connectors.next.skipped', defaultMessage: " {count} {count, plural, one {account isn't linked, so it'll} other {accounts aren't linked, so they'll}} be skipped." }, { count: unlinkedCount })}
      </Text>
      <div className="conn-next-actions">
        {templateKey && (
          <Button size="sm" variant="primary" onClick={openTemplate}>
            {formatMessage({ id: 'connectors.next.setup', defaultMessage: 'Set up automation' })}
          </Button>
        )}
        <Text size="xs" tone="faint">
          {formatMessage({ id: 'connectors.next.prompt', defaultMessage: 'Or ask Lucius now: “Fetch my {provider} transactions.”' }, { provider: providerLabel })}
        </Text>
      </div>
    </>
  )
  if (bare) return <div className="conn-next-body">{body}</div>
  return (
    <div className="conn-next" role="region" aria-label={formatMessage({ id: 'connectors.next.region', defaultMessage: 'Next step' })}>
      <Text size="sm" tone="ink" weight={600}>
        {formatMessage({ id: 'connectors.next.heading', defaultMessage: 'Next: bring in transactions' })}
      </Text>
      {body}
    </div>
  )
}
