import { getNumberLocale } from '../../utils/format'
import { FormattedMessage } from './FormattedMessage'
import { useAppIntl } from '../../i18n/useAppIntl'
import { Panel, Skeleton } from '../ui'
import { fCurrency, plClass } from '../../utils/format'
import type { PeerItem } from '../../types/assetDetail'
import { AssetLink } from './AssetLink'

interface Props {
  peers: PeerItem[]
  /** True while a real facts/peers synthesis pass is actually running (`refreshing` from
   *  useAssetDetail — see KeyFactsCard's matching prop). Owner-reproduced live bug,
   *  2026-08-31 (KODK): with no peers yet and no loading state, this card just silently
   *  rendered nothing — no skeleton, no indication anything was happening. */
  generating?: boolean
}

export function PeersCard({ peers, generating }: Props) {
  const intl = useAppIntl()
  if (!peers.length) {
    // A completed pass can legitimately land zero peers (only comparables actually
    // mentioned in real news coverage are ever shown — see asset_brief.py's own peers
    // prompt) — that's a real, final answer, not a loading state, so this only shows
    // while `generating` is true.
    if (!generating) return null
    return (
      <Panel
        title={intl.formatMessage({ id: "intel.field.68d00dde", defaultMessage: "Peers" })}
        className="asd-rail-panel"
        actions={
          <span className="asd-pi-updating" role="status" aria-label={intl.formatMessage({ id: "intel.field.ef43f7b9", defaultMessage: "Peers are generating" })}>
            <span className="ui-btn__spinner" aria-hidden="true" />
            {<FormattedMessage id="intel.extra.fcbce60e" defaultMessage={"Generating"} />}
          </span>
        }
      >
        <div className="asd-skel-stack" role="status" aria-label={intl.formatMessage({ id: "intel.field.fcbce60e", defaultMessage: "Generating" })}>
          <Skeleton height={13} width="80%" />
          <Skeleton height={13} width="65%" />
        </div>
      </Panel>
    )
  }

  return (
    <Panel title={intl.formatMessage({ id: "intel.field.68d00dde", defaultMessage: "Peers" })} className="asd-rail-panel">
      <div className="asd-peers-list">
        {peers.map((peer, i) => (
          <AssetLink
            key={i}
            ticker={peer.ticker ?? undefined}
            label={peer.name}
            className="asd-peer-row"
          >
            <div className="asd-peer-info">
              <span className="asd-peer-name">{peer.name}</span>
              {(peer.ticker || peer.exchange) && (
                <span className="asd-peer-sub">
                  {[peer.ticker, peer.exchange].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
            {peer.price != null && (
              <div className="asd-peer-price">
                <span className="asd-peer-price-val">
                  {peer.currency
                    ? fCurrency(peer.price, peer.currency, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : peer.price.toLocaleString(getNumberLocale(), {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </span>
                {peer.change_pct != null && (
                  <span className={`asd-peer-change ${plClass(peer.change_pct)}`}>
                    {peer.change_pct >= 0 ? '+' : ''}
                    {peer.change_pct.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })}%
                  </span>
                )}
              </div>
            )}
          </AssetLink>
        ))}
      </div>
    </Panel>
  )
}
