import { useAppIntl } from '../../../../../i18n/useAppIntl'
// Settings › Intelligence → Pulse summaries: how much the Holdings brief and each watchlist tab's
// brief say, from a one-clause headline (1) to a short narrative Lucius writes (5).
import type { BriefVerbosity } from '../../../../intel/monitoringConfig'
import { verbosityOf } from '../../../../intel/monitoringConfig'
import { Field, Panel, Select } from '../../ds'
import type { PanelProps } from './fields'

function VerbositySelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: BriefVerbosity
  onChange: (v: BriefVerbosity) => void
}) {
  const intl = useAppIntl()
  return (
    <Select
      aria-label={label}
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value) as BriefVerbosity)}
    >
      {([1, 2, 3, 4, 5] as BriefVerbosity[]).map((v) => (
        <option key={v} value={v}>
          {intl.formatMessage({ id: 'intel.settings.verbosity', defaultMessage: '{level, select, 1 {1 · Headline} 2 {2 · Short} 3 {3 · Standard} 4 {4 · Detailed} other {5 · Written by Lucius}}' }, { level: String(v) })}
        </option>
      ))}
    </Select>
  )
}

export function PulseSummaryPanel({ cfg, save }: PanelProps) {
  const intl = useAppIntl()
  const holdings = verbosityOf(cfg, 'holdings')
  const watchlist = verbosityOf(cfg, 'watchlist')
  return (
    <Panel
      title={intl.formatMessage({ id: "intel.settings.1eb41b92", defaultMessage: "Pulse summaries" })}
      sub={intl.formatMessage({ id: "intel.settings.62eb1aa1", defaultMessage: "How much the brief at the top of each Intel tab says. Levels 1–4 are instant; level 5 is written by Lucius." })}
    >
      <div className="rd-formgrid">
        <Field label={intl.formatMessage({ id: "intel.settings.2745afec", defaultMessage: "Holdings brief" })} help={intl.formatMessage({ id: 'intel.settings.holdingsExample', defaultMessage: '{level, select, 1 {“Your book is +S$120 (+0.4%) today.”} 2 {“Your book is +S$120 (+0.4%) today — NVDA led (+S$95), AAPL dragged (−S$30).”} 3 {“… You’re 1.9 pts ahead of SPY 1M.”} 4 {“… Top movers NVDA, AAPL, VWRA. The month’s biggest driver: NVDA (+S$410).”} other {Three to five sentences Lucius writes from the same figures, fact-checked. Uses a model call about every 30 minutes while you have the tab open.}}' }, { level: String(holdings) })}>
          <VerbositySelect
            label={intl.formatMessage({ id: "intel.settings.4ca91734", defaultMessage: "Holdings brief detail" })}
            value={holdings}
            onChange={(v) => save({ holdings_brief_verbosity: v }, intl.formatMessage({ id: "intel.settings.8e4b0fd4", defaultMessage: "Holdings brief updated" }))}
          />
        </Field>
        <Field label={intl.formatMessage({ id: "intel.settings.217847cf", defaultMessage: "Watchlist briefs" })} help={intl.formatMessage({ id: 'intel.settings.watchExample', defaultMessage: '{level, select, 1 {“AMD fell 9.0% today — 3.1× its usual move.”} 2 {“… NVDA reports earnings in 3 days.”} 3 {“… Over the past month, AVGO did best against its comparison, INTC worst.”} 4 {“… Also this week: TSM (ex-dividend). 4 up, 2 down, 1 flagged.”} other {Three to five sentences Lucius writes from the list’s rows, fact-checked. Uses a model call about every 30 minutes per list.}}' }, { level: String(watchlist) })}>
          <VerbositySelect
            label={intl.formatMessage({ id: "intel.settings.a1520025", defaultMessage: "Watchlist brief detail" })}
            value={watchlist}
            onChange={(v) => save({ watchlist_brief_verbosity: v }, intl.formatMessage({ id: "intel.settings.fe5963c2", defaultMessage: "Watchlist briefs updated" }))}
          />
        </Field>
      </div>
    </Panel>
  )
}
