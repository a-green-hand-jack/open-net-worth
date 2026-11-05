// Rebalance — rebalancing suggestions panel. Verbatim port of prototype Rebalance().
// Shows trades needed to bring each asset class back to its target allocation.

import { fBase } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { investmentClassLabel } from './investmentClassLabel'

interface AllocRow {
  cls: string
  cur: number // ROUNDED, display only
  tgt: number // ROUNDED, display only
  // Unrounded, server-computed (backend/services/investments_book.py `_sections`) — MATH-38:
  // sizing a trade off the rounded cur/tgt compounded the rounding into real money (book
  // 1,000,000, current 32.6%, target 29.4% → the true trade is -32,000, the rounded one -40,000).
  driftPp: number
  tradeBase: number
}

interface Props {
  alloc: AllocRow[]
  // Drift (pp) at/above which a class is flagged — the server's ONE constant
  // (rebalance.DRIFT_FLAG_PP), never a number of our own (MATH-37).
  thresholdPp: number
}

function Card({
  title,
  meta,
  children,
}: {
  title: string
  meta?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mk-card">
      <div className="mk-card-head">
        <span className="mk-card-title">{title}</span>
        {meta && <span className="mk-card-meta">{meta}</span>}
      </div>
      <div className="mk-card-body">{children}</div>
    </div>
  )
}

export function Rebalance({ alloc, thresholdPp }: Props) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const className = (value: string) => investmentClassLabel(value, value, intl)
  const hasTargets = alloc.some((a) => a.tgt > 0)

  if (!hasTargets) {
    return (
      <Card
        title={formatMessage({ id: 'rebalance.title', defaultMessage: 'Rebalancing' })}
        meta={formatMessage({ id: 'rebalance.noTargets', defaultMessage: 'no targets set' })}
      >
        <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>
          {formatMessage({
            id: 'rebalance.setTargets',
            defaultMessage:
              'Set allocation targets in the panel above to see rebalancing suggestions.',
          })}
        </div>
      </Card>
    )
  }

  // Trade size and direction come straight from the server (`driftPp`/`tradeBase`) — never
  // re-derived from the rounded `cur`/`tgt` display percents (MATH-38).
  const trades = alloc
    .filter((a) => Math.abs(a.driftPp) >= thresholdPp)
    .map((a) => ({
      act: a.driftPp > 0 ? 'trim' : 'buy',
      cls: className(a.cls),
      amt: a.tradeBase,
      why:
        a.driftPp > 0
          ? formatMessage(
              {
                id: 'rebalance.trimWhy',
                defaultMessage: '{className} {current}% → trim toward {target}%',
              },
              { className: className(a.cls), current: a.cur, target: a.tgt },
            )
          : formatMessage(
              {
                id: 'rebalance.buyWhy',
                defaultMessage: '{className} {current}% → top up toward {target}%',
              },
              { className: className(a.cls), current: a.cur, target: a.tgt },
            ),
    }))
    .sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt))

  return (
    <Card
      title={formatMessage({ id: 'rebalance.title', defaultMessage: 'Rebalancing' })}
      meta={
        trades.length
          ? formatMessage(
              {
                id: 'rebalance.trades',
                defaultMessage: '{count, plural, one {# trade} other {# trades}}',
              },
              { count: trades.length },
            )
          : formatMessage({ id: 'rebalance.onTarget', defaultMessage: 'on target' })
      }
    >
      {trades.length ? (
        <div className="mk-rb">
          {trades.map((t, i) => (
            <div className="mk-rb-row" key={i}>
              <span className={`mk-rb-act ${t.act}`}>
                {t.act === 'trim'
                  ? formatMessage({ id: 'rebalance.trim', defaultMessage: 'TRIM' })
                  : formatMessage({ id: 'rebalance.buy', defaultMessage: 'BUY' })}
              </span>
              <span className="mk-rb-cls">{t.cls}</span>
              <span
                className="mk-rb-amt mask"
                style={{ color: t.amt < 0 ? 'var(--bad)' : 'var(--good)' }}
              >
                {(t.amt < 0 ? '−' : '+') + fBase(Math.abs(t.amt))}
              </span>
              <span className="mk-rb-why">{t.why}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>
          {formatMessage({
            id: 'rebalance.already',
            defaultMessage: 'Already on target — no trades needed.',
          })}
        </div>
      )}
      {trades.length > 0 && (
        <div className="mk-rb-foot">
          <div className="mk-rb-note">
            {formatMessage({
              id: 'rebalance.disclaimer',
              defaultMessage:
                "Suggested trades to place at your brokerage — ONW tracks your book, it doesn't execute.",
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
