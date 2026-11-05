import { useAppIntl } from '../../../../../i18n/useAppIntl'
// Settings › Intelligence → AI analysis: the model-written layers on watched tickers (explained
// alerts, Lucius's read on every watch story) and how far their opinion may go.
import { OPINION_OPTIONS } from '../../../../intel/monitoringConfig'
import type { OpinionLevel } from '../../../../intel/monitoringConfig'
import { Field, Panel, Select, Toggle, row } from '../../ds'
import { NumberInput } from './fields'
import type { PanelProps } from './fields'

export function AiAnalysisPanel({ cfg, save }: PanelProps) {
  const intl = useAppIntl()
  const reads = cfg.watch_reads_enabled ?? true
  const level = cfg.ai_opinion_level ?? 'information'

  return (
    <Panel
      title={intl.formatMessage({ id: "intel.settings.c2f42230", defaultMessage: "AI analysis on watched tickers" })}
      sub={intl.formatMessage({ id: "intel.settings.3fb9b3a6", defaultMessage: "What Lucius writes on top of the price signals. Every figure is checked against the data before it's shown." })}
    >
      {row(
        intl.formatMessage({ id: "intel.settings.937f2895", defaultMessage: "Explained alerts" }),
        intl.formatMessage({ id: "intel.settings.042c581f", defaultMessage: "On a material move, Lucius writes a sourced explanation and sends it to the channels you chose for watch alerts (at most 8 a day)." }),
        <Toggle
          on={cfg.explained_alerts_enabled ?? true}
          label={intl.formatMessage({ id: "intel.settings.937f2895", defaultMessage: "Explained alerts" })}
          onChange={(v) =>
            save(
              { explained_alerts_enabled: v },
              v ? intl.formatMessage({ id: "intel.settings.e95c1c4a", defaultMessage: "Explained alerts on" }) : intl.formatMessage({ id: "intel.settings.28ea557a", defaultMessage: "Explained alerts off" }),
            )
          }
        />,
      )}
      {row(
        intl.formatMessage({ id: "intel.settings.318fe4f0", defaultMessage: "Lucius’s read on every watch story" }),
        intl.formatMessage({ id: "intel.settings.d7a71442", defaultMessage: "A short in-app read on each watch story — what it means for you and what to watch next. Never pushed." }),
        <Toggle
          on={reads}
          label={intl.formatMessage({ id: "intel.settings.2984f05d", defaultMessage: "Lucius's read on watch stories" })}
          onChange={(v) =>
            save({ watch_reads_enabled: v }, v ? intl.formatMessage({ id: "intel.settings.52c80399", defaultMessage: "Watch-story reads on" }) : intl.formatMessage({ id: "intel.settings.378b420b", defaultMessage: "Watch-story reads off" }))
          }
        />,
      )}
      <div className="rd-formgrid">
        <Field label={intl.formatMessage({ id: "intel.settings.22cd0dc5", defaultMessage: "Reads per day" })} help={intl.formatMessage({ id: "intel.settings.ce0163b5", defaultMessage: "A cap on the model calls these reads can make (0–50)." })}>
          <NumberInput
            id="watch-reads-per-day"
            value={cfg.watch_reads_per_day ?? 20}
            min={0}
            max={50}
            disabled={!reads}
            onCommit={(n) => save({ watch_reads_per_day: n }, intl.formatMessage({ id: "intel.settings.8245ad2b", defaultMessage: "Reads per day updated" }))}
          />
        </Field>
        <Field label={intl.formatMessage({ id: "intel.settings.cb42dacc", defaultMessage: "How far Lucius’s opinion goes" })} help={`${intl.formatMessage({ id: 'intel.settings.opinionHelp', defaultMessage: '{level, select, information {Lucius explains what happened and what it could mean for you, and lists considerations. It never takes a side.} lean {Adds Lucius’s overall lean — bullish, bearish or neutral — with its reason. Still no instructions to buy or sell.} other {Adds the lean and at most one suggestion framed against your own thesis and buy zone. Never urgent, never a promise.}}' }, { level })} ${intl.formatMessage({ id: 'intel.settings.notAdvice', defaultMessage: "Lucius's view, not financial advice. The decision is always yours." })}`}>
          <Select
            aria-label={intl.formatMessage({ id: "intel.settings.0e5c4bcf", defaultMessage: "How far Lucius's opinion goes" })}
            value={level}
            onChange={(e) =>
              save({ ai_opinion_level: e.target.value as OpinionLevel }, intl.formatMessage({ id: "intel.settings.a7fdeb22", defaultMessage: "Opinion level updated" }))
            }
          >
            {OPINION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {intl.formatMessage({ id: 'intel.settings.opinionOption', defaultMessage: '{level, select, information {Information only} lean {Show a lean} other {Allow suggestions}}' }, { level: o.value })}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Panel>
  )
}
