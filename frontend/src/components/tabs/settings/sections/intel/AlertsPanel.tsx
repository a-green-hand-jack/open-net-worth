import { useAppIntl } from '../../../../../i18n/useAppIntl'
// Settings › Intelligence → Alerts: where each KIND of Intel update reaches you (one grid,
// ADR 2026-09-30-notification-channels-per-kind-and-per-alert). The scheduled daily digest was
// removed — a Daily briefing Automation does that job.
import type { AlertChannel, NotifyKind, NotifyRoutes } from '../../../../intel/monitoringConfig'
import { NOTIFY_KINDS, notifyRoutes, visibleChannels } from '../../../../intel/monitoringConfig'
import { InfoPopover } from '../../../../ui/InfoPopover'
import { Panel } from '../../ds'
import type { PanelProps } from './fields'

function RoutesGrid({
  routes,
  channels,
  onChange,
}: {
  routes: NotifyRoutes
  channels: AlertChannel[]
  onChange: (kind: NotifyKind, next: string[]) => void
}) {
  const intl = useAppIntl()
  return (
    <div className="rd-nroutes-wrap">
      <table className="rd-nroutes">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">{intl.formatMessage({ id: "intel.settings.4b6b761f", defaultMessage: "Kind of update" })}</span>
            </th>
            <th scope="col">{intl.formatMessage({ id: "intel.settings.dbe0ed15", defaultMessage: "In-app" })}</th>
            {channels.map((ch) => (
              <th scope="col" key={ch.id}>
                <span className="rd-nroutes-ch">
                  {ch.label}
                  {!ch.available && (
                    <InfoPopover
                      width={220}
                      text={
                        Object.values(routes).some((ids) => ids.includes(ch.id))
                          ? intl.formatMessage({ id: 'intel.settings.channelDisabled', defaultMessage: "{channel} is turned off in Connectors, so it's skipped until you turn it back on." }, { channel: ch.label })
                          : intl.formatMessage({ id: 'intel.settings.channelMissing', defaultMessage: "{channel} isn't set up yet. Connect it in Connectors to send updates there." }, { channel: ch.label })
                      }
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NOTIFY_KINDS.map((k) => (
            <tr key={k.id}>
              <th scope="row">
                <span className="rd-nroutes-kind">{intl.formatMessage({ id: 'intel.settings.notifyKind', defaultMessage: '{kind, select, price_alerts {Price alerts} watch_alerts {Watch alerts} other {News analyses}}' }, { kind: k.id })}</span>
                <span className="rd-nroutes-sub">{intl.formatMessage({ id: 'intel.settings.notifyHelp', defaultMessage: '{kind, select, price_alerts {Default for new alerts. Each alert can change its own.} watch_alerts {Big moves on what you hold or watch.} other {Lucius on news that moves your names.}}' }, { kind: k.id })}</span>
              </th>
              <td>
                <input type="checkbox" checked disabled aria-label={intl.formatMessage({ id: 'intel.settings.inAppFor', defaultMessage: '{kind} in-app' }, { kind: intl.formatMessage({ id: 'intel.settings.notifyKind', defaultMessage: '{kind, select, price_alerts {Price alerts} watch_alerts {Watch alerts} other {News analyses}}' }, { kind: k.id }) })} />
              </td>
              {channels.map((ch) => {
                const on = routes[k.id].includes(ch.id)
                // Chosen, then its connector was turned off: skipped until it's back. Still
                // clickable so it can be cleared here.
                const stale = on && !ch.available
                return (
                  <td key={ch.id} className={stale ? 'rd-nroutes-stale' : undefined}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!ch.available && !on}
                      title={stale ? intl.formatMessage({ id: 'intel.settings.channelSkipped', defaultMessage: '{channel} is off in Connectors — skipped' }, { channel: ch.label }) : undefined}
                      aria-label={intl.formatMessage({ id: 'intel.settings.viaChannel', defaultMessage: '{kind} via {channel}' }, { kind: intl.formatMessage({ id: 'intel.settings.notifyKind', defaultMessage: '{kind, select, price_alerts {Price alerts} watch_alerts {Watch alerts} other {News analyses}}' }, { kind: k.id }), channel: ch.label })}
                      onChange={(e) =>
                        onChange(
                          k.id,
                          e.target.checked
                            ? [...routes[k.id], ch.id]
                            : routes[k.id].filter((c) => c !== ch.id),
                        )
                      }
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AlertsPanel({ cfg, save, channels }: PanelProps & { channels: AlertChannel[] }) {
  const intl = useAppIntl()
  const routes = notifyRoutes(cfg)

  const setRoute = (kind: NotifyKind, next: string[]) => {
    const label = intl.formatMessage({ id: 'intel.settings.notifyKind', defaultMessage: '{kind, select, price_alerts {Price alerts} watch_alerts {Watch alerts} other {News analyses}}' }, { kind })
    save({ notify_routes: { ...routes, [kind]: next } }, intl.formatMessage({ id: 'intel.settings.routeUpdated', defaultMessage: '{label} updated' }, { label }))
  }

  return (
    <Panel
      title={intl.formatMessage({ id: "intel.settings.f0d6c55d", defaultMessage: "Alerts" })}
      sub={intl.formatMessage({ id: "intel.settings.19fa073b", defaultMessage: "Where each kind of update reaches you. Everything always shows in the app too." })}
    >
      <RoutesGrid
        routes={routes}
        channels={visibleChannels(channels, Object.values(routes).flat())}
        onChange={setRoute}
      />
    </Panel>
  )
}
