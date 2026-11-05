import { useAppIntl } from '../../../../../i18n/useAppIntl'
// Settings › Intelligence → Advanced: the thresholds behind crash-watch and news-spike alerts.
// Collapsed by default — the defaults are calibrated per asset class.
import { useState } from 'react'
import type { CrashThresholds } from '../../../../intel/monitoringConfig'
import { DEFAULT_CRASH } from '../../../../intel/monitoringConfig'
import { Btn, Field, Panel } from '../../ds'
import { NumberInput } from './fields'
import type { PanelProps } from './fields'

const CRASH_FIELDS: { key: keyof CrashThresholds; label: string }[] = [
  { key: 'equity', label: 'Equity crash threshold (%)' },
  { key: 'commodity', label: 'Commodity crash threshold (%)' },
  { key: 'crypto', label: 'Crypto crash threshold (%)' },
]

export function AdvancedPanel({ cfg, save }: PanelProps) {
  const intl = useAppIntl()
  const [open, setOpen] = useState(false)
  const active = cfg.enabled
  const ct = cfg.crash_thresholds ?? DEFAULT_CRASH

  return (
    <Panel
      title={intl.formatMessage({ id: "intel.settings.45f80a27", defaultMessage: "Advanced" })}
      sub={intl.formatMessage({ id: "intel.settings.037ca534", defaultMessage: "Tune the thresholds that trigger crash-watch and news-spike alerts. Only change these if the defaults are too noisy or too quiet." })}
      actions={
        <Btn size="xs" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? intl.formatMessage({ id: "intel.settings.04ab6415", defaultMessage: "Hide" }) : intl.formatMessage({ id: "intel.settings.923c763f", defaultMessage: "Show" })}
        </Btn>
      }
    >
      {open ? (
        <div className="rd-formgrid">
          {CRASH_FIELDS.map((f) => (
            <Field
              key={f.key}
              label={intl.formatMessage({ id: 'intel.settings.crashField', defaultMessage: '{asset, select, equity {Equity crash threshold (%)} commodity {Commodity crash threshold (%)} other {Crypto crash threshold (%)}}' }, { asset: f.key })}
              help={intl.formatMessage({ id: "intel.settings.a9527839", defaultMessage: "Alert fires when a holding falls this % below its prior close." })}
            >
              <NumberInput
                id={`crash-${f.key}`}
                value={ct[f.key]}
                min={1}
                max={99}
                step={0.5}
                integer={false}
                disabled={!active}
                onCommit={(n) =>
                  save({ crash_thresholds: { ...ct, [f.key]: n } }, intl.formatMessage({ id: "intel.settings.1ed9f286", defaultMessage: "Crash threshold updated" }))
                }
              />
            </Field>
          ))}
          <Field
            label={intl.formatMessage({ id: "intel.settings.58ad300b", defaultMessage: "Spike floor (articles)" })}
            help={intl.formatMessage({ id: "intel.settings.c5e5bca2", defaultMessage: "Minimum recent articles in the 90-min window before a spike fires." })}
          >
            <NumberInput
              id="spike-min-abs"
              value={cfg.spike_min_abs ?? 5}
              min={1}
              max={50}
              disabled={!active}
              onCommit={(n) => save({ spike_min_abs: n }, intl.formatMessage({ id: "intel.settings.3f322370", defaultMessage: "Spike floor updated" }))}
            />
          </Field>
          <Field
            label={intl.formatMessage({ id: "intel.settings.b1baad19", defaultMessage: "Spike multiplier" })}
            help={intl.formatMessage({ id: "intel.settings.1ecb80ee", defaultMessage: "Recent count must exceed this multiple of the trailing baseline rate." })}
          >
            <NumberInput
              id="spike-factor"
              value={cfg.spike_factor ?? 3}
              min={1}
              max={20}
              step={0.1}
              integer={false}
              disabled={!active}
              onCommit={(n) => save({ spike_factor: n }, intl.formatMessage({ id: "intel.settings.14dd7daf", defaultMessage: "Spike multiplier updated" }))}
            />
          </Field>
        </div>
      ) : (
        <span className="rd-help">
          {intl.formatMessage({ id: 'intel.settings.advancedSummary', defaultMessage: 'Crash-watch: equity {equity}%, commodity {commodity}%, crypto {crypto}%. News spike: {articles} articles, {factor}× baseline.' }, { equity: ct.equity, commodity: ct.commodity, crypto: ct.crypto, articles: cfg.spike_min_abs ?? 5, factor: cfg.spike_factor ?? 3 })}
        </span>
      )}
    </Panel>
  )
}
