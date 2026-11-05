import { useAppIntl } from '../../i18n/useAppIntl'
import { useState } from 'react'
import { Button, InfoPopover, TextField } from '../ui'
import { Sparkles } from '../../ui/icons'
import { IntelCardHead } from './IntelCardHead'
import type { WatchlistItem } from './WatchlistsSection'

// The Topics & macro tab's lead card: the topics you follow (tap to edit one), a way to follow
// another, and — on a cold start — a few starter topics.

const STARTER_TOPICS = [
  'Global markets this week',
  'Central-bank policy & rates',
  'AI & technology',
  'Geopolitics & markets',
]


interface Props {
  topics: WatchlistItem[]
  onEditTopic: (item: WatchlistItem) => void
  onAddTopic: (topic: string) => void
}

export function TopicsStrip({ topics, onEditTopic, onAddTopic }: Props) {
  const intl = useAppIntl()
  const starters = [intl.formatMessage({ id: 'intel.starter.markets', defaultMessage: 'Global markets this week' }), intl.formatMessage({ id: 'intel.starter.rates', defaultMessage: 'Central-bank policy & rates' }), intl.formatMessage({ id: 'intel.starter.ai', defaultMessage: 'AI & technology' }), intl.formatMessage({ id: 'intel.starter.geopolitics', defaultMessage: 'Geopolitics & markets' })]
  return (
    <section className="intel-brief-card">
      <IntelCardHead
        icon={<Sparkles size={13} />}
        title={intl.formatMessage({ id: 'intel.followedTopics', defaultMessage: 'Topics you follow' })}
        info={<InfoPopover text={intl.formatMessage({ id: 'intel.topicsAbout', defaultMessage: 'Topics & macro collects the topics you follow — each is followed on its own, not kept in a watchlist — plus market-wide stories: central banks, currencies and the economy, and news about companies you neither own nor watch. Stories about your holdings are on My holdings; stories about a watchlist’s tickers are on that list’s tab.' })} width={300} />}
      />
      <div className="intel-topics-strip-body">
        {topics.length > 0 ? (
          <div className="intel-topics-chips">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`intel-topic-chip${t.monitor_news === false ? ' intel-topic-chip--muted' : ''}`}
                onClick={() => onEditTopic(t)}
                title={t.monitor_news === false ? intl.formatMessage({ id: 'intel.mutedEdit', defaultMessage: 'Muted — tap to edit' }) : intl.formatMessage({ id: 'intel.tapEdit', defaultMessage: 'Tap to edit' })}
              >
                {t.label || t.value}
                {t.monitor_news === false && <span className="intel-topic-chip-count">{intl.formatMessage({ id: 'intel.muted', defaultMessage: 'muted' })}</span>}
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="intel-topics-note">
              {intl.formatMessage({ id: 'intel.followHelp', defaultMessage: 'Follow a theme, an industry or a company and Lucius builds a story from it on the next scan.' })}
            </p>
            <div className="intel-topics-chips">
              {STARTER_TOPICS.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className="intel-topic-chip"
                  onClick={() => onAddTopic(t)}
                >
                  + {starters[i]}
                </button>
              ))}
            </div>
          </>
        )}
        <FollowTopicRow onAdd={onAddTopic} />
      </div>
    </section>
  )
}

function FollowTopicRow({ onAdd }: { onAdd: (t: string) => void }) {
  const intl = useAppIntl()
  const [val, setVal] = useState('')
  function submit() {
    const t = val.trim()
    if (!t) return
    onAdd(t)
    setVal('')
  }
  return (
    <div className="intel-follow-topic-row">
      <TextField
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={intl.formatMessage({ id: 'intel.followPlaceholder', defaultMessage: 'Follow another topic — e.g. "SpaceX IPO and relevant stocks"' })}
        aria-label={intl.formatMessage({ id: 'intel.followAnother', defaultMessage: 'Follow another topic' })}
      />
      <Button variant="primary" onClick={submit} disabled={!val.trim()}>
        {intl.formatMessage({ id: 'intel.addViaLucius', defaultMessage: 'Add via Lucius ✦' })}
      </Button>
    </div>
  )
}
