import { useAppIntl } from '../../../../../i18n/useAppIntl'
// Settings › Intelligence → Monitoring: whether Lucius watches at all, how often it checks prices
// and scans news, and the paid/unpaid news sources it uses.
import { fDuration } from '../../../../../utils/format'
import {
  FRESHNESS_OPTS,
  NEWS_OPTS,
  PRICE_OPTS,
  intervalOptions,
} from '../../../../intel/monitoringConfig'
import { Field, Panel, Select, Toggle, row } from '../../ds'
import { NumberInput } from './fields'
import type { PanelProps } from './fields'

export function MonitoringCadencePanel({ cfg, save }: PanelProps) {
  const intl = useAppIntl()
  const duration = (seconds: number) => {
    if (intl.locale.toLowerCase().startsWith('en')) return fDuration(seconds)
    const unit = seconds < 60 ? 'second' : seconds < 3600 || seconds % 3600 !== 0 ? 'minute' : 'hour'
    const value = unit === 'second' ? seconds : unit === 'minute' ? Math.round(seconds / 60) : seconds / 3600
    return intl.formatNumber(value, { style: 'unit', unit, unitDisplay: 'short' })
  }
  const active = cfg.enabled
  const freshness = cfg.news_freshness ?? 'fast'
  const hotActive = active && freshness !== 'off'
  const webSearch = cfg.web_search_enabled ?? true
  const cadence = active
    ? intl.formatMessage({ id: 'intel.settings.cadenceSummary', defaultMessage: 'Prices every {prices} · news every {news}' }, { prices: duration(cfg.price_check_interval_seconds), news: duration(cfg.news_scan_interval_seconds) })
    : intl.formatMessage({ id: 'intel.settings.paused', defaultMessage: 'Paused — no price checks, scans or alerts' })

  return (
    <Panel
      title={intl.formatMessage({ id: "intel.settings.f512948d", defaultMessage: "Monitoring" })}
      sub={intl.formatMessage({ id: "intel.settings.af14b1de", defaultMessage: "How often Lucius checks prices and scans news on your watchlists" })}
    >
      {row(
        intl.formatMessage({ id: "intel.settings.6ca34653", defaultMessage: "Monitoring active" }),
        cadence,
        <Toggle
          on={active}
          label={intl.formatMessage({ id: "intel.settings.6ca34653", defaultMessage: "Monitoring active" })}
          onChange={(v) => save({ enabled: v }, v ? intl.formatMessage({ id: "intel.settings.5220f42c", defaultMessage: "Monitoring resumed" }) : intl.formatMessage({ id: "intel.settings.610cf4ca", defaultMessage: "Monitoring paused" }))}
        />,
      )}
      <div className="rd-formgrid">
        <Field label={intl.formatMessage({ id: "intel.settings.6baf94b0", defaultMessage: "Price check" })} help={intl.formatMessage({ id: "intel.settings.e54035c0", defaultMessage: "How often prices are checked." })}>
          <Select
            aria-label={intl.formatMessage({ id: "intel.settings.6baf94b0", defaultMessage: "Price check" })}
            value={String(cfg.price_check_interval_seconds)}
            disabled={!active}
            onChange={(e) =>
              save({ price_check_interval_seconds: Number(e.target.value) }, intl.formatMessage({ id: "intel.settings.0c7a9559", defaultMessage: "Price check updated" }))
            }
          >
            {intervalOptions(PRICE_OPTS, cfg.price_check_interval_seconds).map((o) => (
              <option key={o.value} value={o.value}>
                {duration(Number(o.value))}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={intl.formatMessage({ id: "intel.settings.43b9f4cf", defaultMessage: "News scan interval" })} help={intl.formatMessage({ id: "intel.settings.ebac50c0", defaultMessage: "How often the full news scan runs." })}>
          <Select
            aria-label={intl.formatMessage({ id: "intel.settings.43b9f4cf", defaultMessage: "News scan interval" })}
            value={String(cfg.news_scan_interval_seconds)}
            disabled={!active}
            onChange={(e) =>
              save({ news_scan_interval_seconds: Number(e.target.value) }, intl.formatMessage({ id: "intel.settings.bc5f8909", defaultMessage: "News scan updated" }))
            }
          >
            {intervalOptions(NEWS_OPTS, cfg.news_scan_interval_seconds).map((o) => (
              <option key={o.value} value={o.value}>
                {duration(Number(o.value))}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={intl.formatMessage({ id: "intel.settings.e7cb399b", defaultMessage: "RSS freshness" })}
          help={intl.formatMessage({ id: "intel.settings.00e977ce", defaultMessage: "Sets the fast-lane cadence (holdings + topics) and keeps the ~90s breaking-news lane running. Off stops both — only the slow ~30 min backfill remains." })}
        >
          <Select
            aria-label={intl.formatMessage({ id: "intel.settings.e7cb399b", defaultMessage: "RSS freshness" })}
            value={freshness}
            disabled={!active}
            onChange={(e) =>
              save(
                { news_freshness: e.target.value as 'off' | 'balanced' | 'fast' },
                intl.formatMessage({ id: "intel.settings.69694928", defaultMessage: "RSS freshness updated" }),
              )
            }
          >
            {FRESHNESS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {typeof o.value === 'string' && ['off', 'balanced', 'fast'].includes(o.value) ? intl.formatMessage({ id: 'intel.settings.rssOption', defaultMessage: '{value, select, off {Off (no fast poll)} balanced {Balanced (15 min)} other {Fast (5 min)}}' }, { value: o.value }) : o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {row(
        intl.formatMessage({ id: 'intel.settings.breakingLane', defaultMessage: 'Breaking news lane · {active, select, yes {Active} other {Off}} · ~90s' }, { active: hotActive ? 'yes' : 'no' }),
        hotActive
          ? intl.formatMessage({ id: "intel.settings.e1973c6d", defaultMessage: "Checked while on: FT, CNBC, MarketWatch, WSJ and TechCrunch headlines." })
          : intl.formatMessage({ id: "intel.settings.96d44b39", defaultMessage: "Turn RSS freshness on to enable outlet headlines." }),
        <Toggle
          on={cfg.outlet_feeds_enabled ?? true}
          disabled={!hotActive}
          label={intl.formatMessage({ id: "intel.settings.e71e2405", defaultMessage: "Outlet headlines" })}
          onChange={(v) =>
            save({ outlet_feeds_enabled: v }, v ? intl.formatMessage({ id: "intel.settings.824fba0c", defaultMessage: "Outlet headlines on" }) : intl.formatMessage({ id: "intel.settings.b73ea279", defaultMessage: "Outlet headlines off" }))
          }
        />,
      )}
      {row(
        intl.formatMessage({ id: "intel.settings.f6f7d5f2", defaultMessage: "Web search" }),
        intl.formatMessage({ id: "intel.settings.67f81290", defaultMessage: "Uses the search budget below; RSS always runs regardless of this setting." }),
        <Toggle
          on={webSearch}
          disabled={!active}
          label={intl.formatMessage({ id: "intel.settings.f6f7d5f2", defaultMessage: "Web search" })}
          onChange={(v) => save({ web_search_enabled: v }, v ? intl.formatMessage({ id: "intel.settings.e6b55568", defaultMessage: "Web search on" }) : intl.formatMessage({ id: "intel.settings.fd85fdd7", defaultMessage: "Web search off" }))}
        />,
      )}
      <div className="rd-formgrid">
        <Field
          label={intl.formatMessage({ id: "intel.settings.756e6be6", defaultMessage: "Web search budget (calls / scan)" })}
          help={intl.formatMessage({ id: "intel.settings.95db9319", defaultMessage: "Max paid searches per scan; RSS is always free. Only applies when Web search is on." })}
        >
          <NumberInput
            id="search-budget"
            value={cfg.search_budget ?? 15}
            min={1}
            max={50}
            disabled={!webSearch || !active}
            onCommit={(n) => save({ search_budget: n }, intl.formatMessage({ id: "intel.settings.b378dbe9", defaultMessage: "Search budget updated" }))}
          />
        </Field>
      </div>
    </Panel>
  )
}
