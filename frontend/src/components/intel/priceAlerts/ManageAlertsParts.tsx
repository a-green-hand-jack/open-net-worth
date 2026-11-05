import { getNumberLocale } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { defineMessages, type MessageDescriptor } from 'react-intl'
import { FormattedMessage } from '../FormattedMessage'
// The manage view's three sub-blocks — the Lucius suggestion set, one alert row, and the
// ticker's additional news feeds. Split out of ManageAlerts.tsx for file size only;
// the DOM and class names are the prototype's, unchanged.
import { useRef, useState } from 'react'
import { Button, Money, Switch, TextField } from '../../ui'
import { Check, ChevronDown, ChevronRight, RefreshCw, Sparkles, X } from '../../../ui/icons'
import {
  AFTER_SHORT,
  NEAR,
  OPSYM,
  afterFireFromCondition,
  CUSTOM_FEED_POLL_SECONDS,
  conditionChip,
  fmt,
  rowTitle,
} from './alertModel'
import type { AlertRecord } from './alertModel'
import { routeSummary, useAlertRouting } from './alertRouting'

const cooldownLabels = defineMessages({
  '15': { id: 'intel.alert.cool15', defaultMessage: '15 min cooldown' },
  '30': { id: 'intel.alert.cool30', defaultMessage: '30 min cooldown' },
  '60': { id: 'intel.alert.cool60', defaultMessage: '1 hour cooldown' },
  '360': { id: 'intel.alert.cool360', defaultMessage: '6 hour cooldown' },
  '720': { id: 'intel.alert.cool720', defaultMessage: '12 hour cooldown' },
  '1440': { id: 'intel.alert.cool1440', defaultMessage: '24 hour cooldown' },
  '0': { id: 'intel.alert.afterNone', defaultMessage: 'No cooldown' },
  off: { id: 'intel.alert.offAfter', defaultMessage: 'Turns off after firing' },
})

export interface SuggestionView {
  op: '>=' | '<='
  value: number
  name: string
  why: string
  note: string
}

export function SuggestionSet({
  sym,
  ccy,
  sugg,
  onSuggest,
  onAdd,
  onAddAll,
  onDismiss,
}: {
  sym: string
  ccy: string
  sugg: SuggestionView[] | null
  onSuggest: () => void
  onAdd: (s: SuggestionView) => void
  onAddAll: () => void
  onDismiss: (index: number) => void
}) {
  const intl = useAppIntl()
  if (sugg === null) {
    return (
      <div className="pa-sugg">
        <span className="pa-sugg-ic">
          <Sparkles size={15} strokeWidth={1.7} />
        </span>
        <span className="pa-sugg-b">
          <span className="pa-sugg-t">{<FormattedMessage id="intel.static.not_sure_what_to_set_44a45b64" defaultMessage={"Not sure what to set?"} />}</span>
          <span className="pa-sugg-s">
            {intl.formatMessage({ id: 'intel.alert.suggestHelp', defaultMessage: 'Lucius can suggest alert levels for {symbol} from your position and target mix.' }, { symbol: sym })}
          </span>
        </span>
        <Button variant="secondary" size="sm" className="pa-sugg-btn" onClick={onSuggest}>
          {intl.formatMessage({ id: 'intel.alert.suggest', defaultMessage: 'Suggest' })}
        </Button>
      </div>
    )
  }
  if (sugg.length === 0) return null
  return (
    <div className="pa-sg">
      <div className="pa-sg-head">
        <span className="pa-sugg-ic">
          <Sparkles size={15} strokeWidth={1.7} />
        </span>
        <span className="pa-sg-t">
          {intl.formatMessage({ id: 'intel.alert.suggestCount', defaultMessage: 'Lucius suggests {count, plural, one {# alert} other {# alerts}}' }, { count: sugg.length })}
        </span>
        <Button variant="secondary" size="sm" onClick={onAddAll}>
          {intl.formatMessage({ id: 'intel.alert.addAll', defaultMessage: 'Add all' })}
        </Button>
        <button type="button" className="pa-sg-x" aria-label={intl.formatMessage({ id: 'intel.alert.suggestAgain', defaultMessage: 'Suggest again' })} onClick={onSuggest}>
          <RefreshCw size={13} strokeWidth={2} />
        </button>
      </div>
      {sugg.map((s, k) => (
        <div className="pa-sg-row" key={k}>
          <span className="pa-sg-lvl">
            <i>{OPSYM[s.op]}</i>
            <Money>
              {ccy}
              {fmt(s.value)}
            </Money>
          </span>
          <span>
            <span className="pa-sg-why">{s.why}</span>
            <span className="pa-sg-note">{s.note}</span>
          </span>
          <span className="pa-sg-acts">
            <Button variant="primary" size="sm" onClick={() => onAdd(s)}>
              {intl.formatMessage({ id: 'intel.monitor.add', defaultMessage: 'Add' })}
            </Button>
            <button type="button" className="pa-sg-skip" onClick={() => onDismiss(k)}>
              {intl.formatMessage({ id: 'intel.alert.skip', defaultMessage: 'Skip' })}
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Additional news sources. Each feed commits itself, like the per-alert toggles; a row commits
 * on blur and an empty one is dropped there, matching the upstream filter. */
export function TickerSettings({
  sym,
  feeds,
  feedLaneActive,
  onFeeds,
  onCommitFeeds,
}: {
  sym: string
  feeds: string[]
  /** Whether the hot RSS lane that fetches these feeds is running (null = not known yet). */
  feedLaneActive: boolean | null
  onFeeds: (next: string[]) => void
  onCommitFeeds: (next: string[]) => void
}) {
  const intl = useAppIntl()
  const [feedsOpen, setFeedsOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const savedT = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = () => {
    setSaved(true)
    if (savedT.current) clearTimeout(savedT.current)
    savedT.current = setTimeout(() => setSaved(false), 2200)
  }
  return (
    <div className="pa-set">
      <div className="pa-feeds">
        <button
          type="button"
          className="pa-feeds-head"
          aria-expanded={feedsOpen}
          onClick={() => setFeedsOpen((o) => !o)}
        >
          <span className="pa-feeds-t">{<FormattedMessage id="intel.static.additional_news_sources_134410fc" defaultMessage={"Additional news sources"} />}</span>
          {feeds.length > 0 && (
            <span className="pa-feeds-n">
              {intl.formatMessage({ id: 'intel.alert.feedCount', defaultMessage: '{count, plural, one {# feed} other {# feeds}}' }, { count: feeds.length })}
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2.2}
            className={'pa-feeds-cv' + (feedsOpen ? ' pa-feeds-cv--open' : '')}
          />
        </button>
        {feedsOpen && (
          <div className="pa-feeds-body">
            <p className="pa-feeds-help">
              {intl.formatMessage({ id: 'intel.alert.feedsHelp', defaultMessage: 'Add extra RSS feeds for {symbol} beyond the sources Lucius already pulls from, checked every {seconds} seconds. Up to 5.' }, { symbol: sym, seconds: CUSTOM_FEED_POLL_SECONDS })}
              {feedLaneActive === false && intl.formatMessage({ id: 'intel.alert.feedsPaused', defaultMessage: ' Paused right now: RSS freshness is off in Monitoring settings, so these feeds are not checked.' })}
            </p>
            {feeds.length > 0 && (
              <div className="pa-feed-rows">
                {feeds.map((u, i) => (
                  <div className="pa-feed-row" key={i}>
                    <TextField
                      value={u}
                      placeholder="https://example.com/feed.xml"
                      onChange={(e) => onFeeds(feeds.map((x, j) => (j === i ? e.target.value : x)))}
                      onBlur={() => {
                        const cleaned = feeds.filter((x, j) => (j === i ? x.trim() : true))
                        if (cleaned.length !== feeds.length) onFeeds(cleaned)
                        if (u.trim()) {
                          onCommitFeeds(cleaned)
                          flash()
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="pa-feed-x"
                      aria-label={intl.formatMessage({ id: 'intel.alert.removeFeed', defaultMessage: 'Remove this feed' })}
                      onClick={() => {
                        const next = feeds.filter((_, j) => j !== i)
                        onFeeds(next)
                        onCommitFeeds(next)
                        flash()
                      }}
                    >
                      <X size={13} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="pa-feeds-foot">
              <Button
                variant="ghost"
                size="sm"
                className="pa-addfeed"
                disabled={feeds.length >= 5}
                onClick={() => onFeeds([...feeds, ''])}
              >
                {intl.formatMessage({ id: 'intel.alert.addFeed', defaultMessage: 'Add feed' })}
              </Button>
              <span className="pa-feeds-cap">
                {feeds.length >= 5 ? intl.formatMessage({ id: 'intel.alert.feedMaximum', defaultMessage: 'Maximum of 5' }) : intl.formatMessage({ id: 'intel.alert.feedRemaining', defaultMessage: '{count} of 5 left' }, { count: 5 - feeds.length })}
              </span>
              <span
                className={'pa-saved' + (saved ? ' pa-saved--on' : '')}
                style={{ marginLeft: 'auto' }}
              >
                <Check size={11} strokeWidth={2.4} /> {intl.formatMessage({ id: 'intel.alert.saved', defaultMessage: 'Saved' })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function AlertRow({
  r,
  gap,
  ccy,
  chg,
  onEdit,
  onToggle,
}: {
  r: AlertRecord
  gap: number
  ccy: string
  chg: number | null
  onEdit: (r: AlertRecord) => void
  onToggle: (id: string, on: boolean) => void
}) {
  const intl = useAppIntl()
  const routing = useAlertRouting()
  const enabled = r.enabled !== false
  const near = enabled && gap > 0 && gap <= NEAR
  const chip = conditionChip(r)
  const stat =
    r.kind === 'move'
      ? chg == null
        ? ''
        : intl.formatMessage({ id: 'intel.alert.percentToday', defaultMessage: '{value}% today' }, { value: `${chg >= 0 ? '+' : ''}${chg.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false })}` })
      : !Number.isFinite(gap)
        ? ''
        : gap <= 0
          ? intl.formatMessage({ id: 'intel.alert.pastLevel', defaultMessage: 'Past this level now' })
          : intl.formatMessage({ id: 'intel.alert.away', defaultMessage: '{value}% away' }, { value: gap.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }) })
  const afterKey = afterFireFromCondition(r)
  const after = Object.hasOwn(cooldownLabels, afterKey) ? intl.formatMessage(cooldownLabels[afterKey] as MessageDescriptor) : AFTER_SHORT[afterKey]
  const label = `${chip.sym} ${r.kind === 'move' ? '' : ccy}${chip.text}`
  return (
    <div className={'pa-item' + (enabled ? '' : ' pa-item--off')}>
      <button type="button" className="pa-item-main" onClick={() => onEdit(r)}>
        <span className="pa-chip">
          <i>{chip.sym}</i>
          {r.kind === 'move' ? (
            chip.text
          ) : (
            <Money>
              {ccy}
              {chip.text}
            </Money>
          )}
        </span>
        <span className="pa-body">
          <span className="pa-role">{rowTitle(r, ccy, intl)}</span>
          <span className="pa-note">
            {after} · {routeSummary(r.channels ?? [], routing, intl)}
            {r.note && r.note.trim() ? intl.formatMessage({ id: 'intel.alert.hasInstructions', defaultMessage: ' · Has instructions' }) : ''}
          </span>
        </span>
      </button>
      <span className={'pa-stat' + (near ? ' pa-stat--near' : '')}>{stat}</span>
      <Switch
        checked={enabled}
        disabled={!r.id}
        onChange={(e) => r.id && onToggle(r.id, e.target.checked)}
        aria-label={enabled ? intl.formatMessage({ id: 'intel.alert.turnOff', defaultMessage: 'Turn off the {label} alert' }, { label }) : intl.formatMessage({ id: 'intel.alert.turnOn', defaultMessage: 'Turn on the {label} alert' }, { label })}
      />
      <button
        type="button"
        className="pa-item-go"
        onClick={() => onEdit(r)}
        aria-label={intl.formatMessage({ id: 'intel.alert.edit', defaultMessage: 'Edit alert' })}
      >
        <ChevronRight size={12} strokeWidth={2.2} className="pa-chev" />
      </button>
    </div>
  )
}
