import { useAppIntl } from '../../i18n/useAppIntl'
import { Button, Cluster, EmptyState } from '../ui'
import { Globe } from '../../ui/icons'
import { LuciusCta } from '../intro/LuciusCta'

const TOPICS_MESSAGE =
  'Help me follow topics and macro themes. Ask what I care about, like rates, a currency or a ' +
  'sector, then follow them and run a scan. Ask me one thing at a time.'

// Topics & macro with no stories at all yet — says what will land here and offers the one next
// step. (My holdings and the list tabs never reach this: their pulse rows are the tab.)
export function MacroColdStart({
  scanning,
  onScan,
  onAskLucius,
}: {
  scanning: boolean
  onScan: () => void
  onAskLucius?: (text: string) => void
}) {
  const intl = useAppIntl()
  return (
    <div className="intel-coldstart">
      <EmptyState
        fill
        icon={<Globe size={28} strokeWidth={1.5} aria-hidden="true" />}
        title={intl.formatMessage({ id: 'intel.noTopics', defaultMessage: "No topic or macro stories yet" })}
        body={intl.formatMessage({ id: 'intel.topicsHelp', defaultMessage: "Follow a topic above, then scan — the themes you follow, central banks, currencies and the economy land here." })}
        action={
          <Cluster gap="--space-3" justify="center">
            <Button variant="primary" size="sm" onClick={onScan} disabled={scanning}>
              {scanning ? intl.formatMessage({ id: 'intel.scanning', defaultMessage: "Scanning…" }) : intl.formatMessage({ id: 'intel.scanNow', defaultMessage: "Scan now" })}
            </Button>
            <LuciusCta
              label={intl.formatMessage({ id: 'intel.followLucius', defaultMessage: "Follow with Lucius" })}
              message={TOPICS_MESSAGE}
              onAskLucius={onAskLucius}
            />
          </Cluster>
        }
      />
    </div>
  )
}
