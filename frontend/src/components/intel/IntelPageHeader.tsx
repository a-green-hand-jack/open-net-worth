import { useAppIntl } from '../../i18n/useAppIntl'
import { Button, Cluster, PageHeader } from '../ui'
import { Radar } from '../../ui/icons'
import { FreshnessChip } from './FreshnessChip'
import type { MonitoringConfig } from './monitoringConfig'

/** Intel's page header: when prices and news were last checked (while monitoring is on) and the
 *  manual Scan button. */
export function IntelPageHeader({
  config: cfg,
  scanning,
  onScan,
}: {
  config?: MonitoringConfig
  scanning: boolean
  onScan: () => void
}) {
  const intl = useAppIntl()
  return (
    <PageHeader
      className="intel-page-header"
      title={intl.formatMessage({ id: 'intel.title', defaultMessage: "Intelligence" })}
      subtitle={intl.formatMessage({ id: 'intel.subtitle', defaultMessage: "Market signals, watchlists, and your portfolio brief" })}
      actions={
        <Cluster className="intel-header-actions">
          {cfg?.enabled && (
            <>
              <FreshnessChip
                label={intl.formatMessage({ id: 'intel.prices', defaultMessage: "Prices" })}
                timestamp={cfg.last_price_check_at ?? undefined}
                intervalSeconds={cfg.price_check_interval_seconds}
              />
              <FreshnessChip
                label={intl.formatMessage({ id: 'intel.news', defaultMessage: "News" })}
                timestamp={cfg.last_scan_at ?? undefined}
                intervalSeconds={cfg.news_scan_interval_seconds}
              />
            </>
          )}
          <Button
            variant="primary"
            size="sm"
            className="intel-scan-button"
            aria-label={scanning ? intl.formatMessage({ id: 'intel.scanningAria', defaultMessage: "Scanning intelligence" }) : intl.formatMessage({ id: 'intel.scanAria', defaultMessage: "Scan intelligence" })}
            iconLeft={<Radar size={14} aria-hidden="true" />}
            onClick={onScan}
            disabled={scanning}
          >
            {scanning ? intl.formatMessage({ id: 'intel.scanning', defaultMessage: "Scanning…" }) : intl.formatMessage({ id: 'intel.scan', defaultMessage: "Scan" })}
          </Button>
        </Cluster>
      }
    />
  )
}
