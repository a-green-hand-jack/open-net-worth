// Settings → Developer → Experimental. GENERATED from GET /api/feature-flags: one row per
// declared flag, never hand-written UI per flag (docs/FEATURE_FLAGS.md). A flag that is off
// runs exactly the old code, so switching one back off is always safe.
import { defineMessages, type IntlShape } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { authFetch } from '../../../api/client'
import { useFeatureFlags } from '../../../hooks/useFlag'
import type { FeatureFlag } from '../../../hooks/useFlag'
import { Badge, Btn, Empty, Panel, Toggle, row, useSectionBusy } from './ds'
import type { SectionProps } from './ds'

const flagNames = defineMessages({
  permissions_v2: { id: 'experimental.flag.permissions_v2.name', defaultMessage: 'Permissions v2' },
  search_reads_results: {
    id: 'experimental.flag.search_reads_results.name',
    defaultMessage: 'Search reads results',
  },
  intel_delivery_decider: {
    id: 'experimental.flag.intel_delivery_decider.name',
    defaultMessage: 'Intel delivery decider',
  },
  ynab_import_and_sync: {
    id: 'experimental.flag.ynab_import_and_sync.name',
    defaultMessage: 'YNAB import and sync',
  },
  voice_calls: { id: 'experimental.flag.voice_calls.name', defaultMessage: 'Voice calls' },
})
const flagDescriptions = defineMessages({
  permissions_v2: {
    id: 'experimental.flag.permissions_v2.description',
    defaultMessage:
      "A new permissions model. Each tool has one setting: Always allow, Ask or Block. In Auto mode a model judges each Ask call and only stops you when it is unsure. Approval cards answer Approve, Always allow or Deny. Automations get their own Always allowed and Blocked tool lists. Settings > Permissions lists the built-in tools, and a connector's tools are set on its own page. The YOLO and unattended-script switches are retired while this is on. Details: Lucius > Permissions v2.",
  },
  search_reads_results: {
    id: 'experimental.flag.search_reads_results.description',
    defaultMessage:
      "Web search reads the pages behind its top three results and hands Lucius the passages that match your search, instead of only the search engine's snippet. A search takes a few seconds longer and returns more text; with Tavily or Firecrawl each page read is billed by the provider. The separate X search tool is hidden (Lucius searches X through an ordinary search), and an Automation that allows X search allows web search. Off: searches return snippets only, as before. More in Help: Web search reads its results (Experimental).",
  },
  intel_delivery_decider: {
    id: 'experimental.flag.intel_delivery_decider.description',
    defaultMessage:
      'Lucius decides which Intel news reaches you now, which waits for a roundup, and which stays in the Intel tab.',
  },
  ynab_import_and_sync: {
    id: 'experimental.flag.ynab_import_and_sync.description',
    defaultMessage:
      'Import a whole YNAB plan, then keep it and this book in step on a schedule: from YNAB, to YNAB or both ways. Adds the Data sync tab in Automations.',
  },
  voice_calls: {
    id: 'experimental.flag.voice_calls.description',
    defaultMessage:
      'Talk to Lucius out loud: a Call button in the chat starts a voice call with your microphone. Set it up in Connectors \u2192 Voice calls.',
  },
})

function title(name: string): string {
  const words = name.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const onOff = (v: boolean, intl: IntlShape) =>
  v
    ? intl.formatMessage({ id: 'experimental.on', defaultMessage: 'on' })
    : intl.formatMessage({ id: 'experimental.off', defaultMessage: 'off' })

function stateNote(flag: FeatureFlag, locked: boolean, intl: IntlShape): string {
  const { formatMessage } = intl
  if (locked)
    return formatMessage(
      {
        id: 'experimental.fixed',
        defaultMessage: 'Fixed at its default ({state}) on the public demo.',
      },
      { state: onOff(flag.default, intl) },
    )
  if (flag.source === 'env')
    return formatMessage(
      {
        id: 'experimental.environment',
        defaultMessage:
          'Set to {state} by {variable} on the server — the switch here has no effect while that is set.',
      },
      { state: onOff(flag.enabled, intl), variable: flag.env_var },
    )
  if (flag.source === 'test')
    return formatMessage({ id: 'experimental.test', defaultMessage: 'Forced by a test.' })
  if (flag.stored !== null)
    return formatMessage(
      { id: 'experimental.changedDefault', defaultMessage: 'Changed — the default is {state}.' },
      { state: onOff(flag.default, intl) },
    )
  return formatMessage(
    { id: 'experimental.default', defaultMessage: 'Default ({state}).' },
    { state: onOff(flag.default, intl) },
  )
}

export function ExperimentalPanel({ toast }: SectionProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const { data, error, initialLoading, refresh } = useFeatureFlags()
  useSectionBusy(initialLoading && !data)
  const locked = data?.locked ?? false
  const flags = data?.flags ?? []

  const flagTitle = (flag: FeatureFlag) => {
    const descriptor = flagNames[flag.name as keyof typeof flagNames]
    return descriptor ? formatMessage(descriptor) : title(flag.name)
  }
  const flagDescription = (flag: FeatureFlag) => {
    const descriptor = flagDescriptions[flag.name as keyof typeof flagDescriptions]
    return descriptor ? formatMessage(descriptor) : flag.description
  }

  async function save(flag: FeatureFlag, enabled: boolean | null) {
    try {
      const r = await authFetch(`/api/feature-flags/${encodeURIComponent(flag.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            { id: 'experimental.saveError', defaultMessage: 'Could not save (HTTP {status})' },
            { status: r.status },
          ),
        )
        return
      }
      void refresh()
      toast(
        enabled === null
          ? formatMessage(
              { id: 'experimental.resetToast', defaultMessage: '{name} reset to its default' },
              { name: flagTitle(flag) },
            )
          : formatMessage(
              { id: 'experimental.changedToast', defaultMessage: '{name} turned {state}' },
              { name: flagTitle(flag), state: onOff(enabled, intl) },
            ),
      )
    } catch {
      toast(
        formatMessage({
          id: 'experimental.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  return (
    <Panel
      title={formatMessage({ id: 'experimental.Experimental', defaultMessage: 'Experimental' })}
      sub={formatMessage({
        id: 'experimental.FeaturesStillBeingTriedOutOffMeansTheAppWorksExactlyAsItDidBefore',
        defaultMessage:
          'Features still being tried out. Off means the app works exactly as it did before.',
      })}
    >
      {error && !data ? (
        <Empty
          title={formatMessage({
            id: 'experimental.CouldNotLoadExperimentalFeatures',
            defaultMessage: 'Could not load experimental features',
          })}
          body={formatMessage({
            id: 'experimental.TheServerDidNotAnswer',
            defaultMessage: 'The server did not answer.',
          })}
          action={
            <Btn size="xs" onClick={() => void refresh()}>
              {formatMessage({ id: 'experimental.Retry', defaultMessage: 'Retry' })}
            </Btn>
          }
        />
      ) : initialLoading && !data ? (
        <span className="rd-help">
          {formatMessage({ id: 'experimental.Loading', defaultMessage: 'Loading…' })}
        </span>
      ) : flags.length === 0 ? (
        <Empty
          title={formatMessage({
            id: 'experimental.NoExperimentalFeaturesRightNow',
            defaultMessage: 'No experimental features right now',
          })}
          body={formatMessage({
            id: 'experimental.WhenANewFeatureShipsBehindASwitchItAppearsHereAtItsDefaultAndYouDecideWhenToTurnItOn',
            defaultMessage:
              'When a new feature ships behind a switch, it appears here at its default and you decide when to turn it on.',
          })}
        />
      ) : (
        flags.map((flag) => (
          <div key={flag.name} data-flag={flag.name}>
            {row(
              <>
                {flagTitle(flag)}{' '}
                {flag.kind === 'kill_switch' ? (
                  <Badge tone="warn">
                    {formatMessage({
                      id: 'experimental.KillSwitch',
                      defaultMessage: 'Kill switch',
                    })}
                  </Badge>
                ) : null}{' '}
                {flag.stored !== null && !locked ? (
                  <Badge tone="accent">
                    {formatMessage({ id: 'experimental.Changed', defaultMessage: 'Changed' })}
                  </Badge>
                ) : null}
              </>,
              <>
                {flagDescription(flag)}
                <br />
                {stateNote(flag, locked, intl)}
              </>,
              <>
                {flag.stored !== null && !locked ? (
                  <Btn size="xs" variant="ghost" onClick={() => void save(flag, null)}>
                    {formatMessage({ id: 'experimental.Reset', defaultMessage: 'Reset' })}
                  </Btn>
                ) : null}
                <Toggle
                  on={flag.enabled}
                  disabled={locked || flag.source === 'env' || flag.source === 'test'}
                  onChange={(v) => void save(flag, v)}
                  label={flagTitle(flag)}
                />
              </>,
            )}
          </div>
        ))
      )}
    </Panel>
  )
}
