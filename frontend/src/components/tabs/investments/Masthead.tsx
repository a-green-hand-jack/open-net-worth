import { getNumberLocale } from '../../../utils/format'
// Masthead — portfolio summary bar with sparkline.
// Verbatim port of prototype Masthead({ d, variant='desk' }) — the "desk" variant.
// Layout: Market value (+ % of net worth) | Today | YTD vs benchmark | Unrealized P&L.
//
// Below the phone breakpoint the grid collapses to a single hero cell plus one quiet meta
// line (spec 2026-07-30-investments-mobile-density D1). This is a JS branch, not
// `display: none`, because the cells carry the `data-ctx-fact` attributes Lucius reads off
// the DOM — CSS-hiding them would leave Lucius reporting facts the user cannot see.

import { fBase, fPct } from '../../../utils/format'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { useYtdStat } from '../../../hooks/useYtdStat'
import type { DerivedBook } from './useInvestmentsBook'
import { Sparkline } from '../../ui/Sparkline'
import { useAppIntl } from '../../../i18n/useAppIntl'

interface Props {
  d: DerivedBook
  /** 30D value series for sparkline (oldest → newest). Empty = no sparkline. */
  sparkValues?: number[]
  /** Total net worth for % of NW calculation. */
  /** Daily P&L sum across all rows. */
  totalDay: number
  /** Unrealized P&L sum. */
  totalPL: number
}

function tone(v: number): string {
  return v >= 0 ? 'var(--good)' : 'var(--bad)'
}

function signed(v: number, f: (n: number) => string): string {
  return (v >= 0 ? '+' : '−') + f(Math.abs(v))
}

export function Masthead({ d, sparkValues, totalDay, totalPL }: Props) {
  const { formatMessage } = useAppIntl()
  const up = totalDay >= 0
  const hasSpark = sparkValues && sparkValues.length >= 2
  // Both percentages are the server's (backend/services/investments_book.py): the book's share
  // of everything owned, and unrealized P&L as a return on what was PAID.
  const pctNW = d.pctOfPortfolio
  const portfolioTotal = d.portfolioTotal
  const uplPct = d.totalPLPct
  const isMobile = useIsMobile()
  // YTD belongs to the hero at every width; Portfolio brief contains insights only.
  const { stat: ytd } = useYtdStat()

  // On mobile this line IS the only "Today" reading. Desktop gets a dedicated cell below.
  const todayLine = (
    <div className="mk-sum-sub">
      <span
        className="mask"
        style={{ color: tone(totalDay), fontWeight: 600 }}
        {...(isMobile ? { 'data-ctx-fact': 'Today' } : {})}
      >
        {signed(totalDay, fBase)} {fPct(d.todayPct)}
      </span>{' '}
      {formatMessage({ id: 'investments.masthead.todayLower', defaultMessage: 'today' })}
    </div>
  )

  if (isMobile) {
    return (
      <div className="mk-sum mk-sum--solo">
        <div className="mk-sum-cell">
          {/* Hero on the left, YTD in the space to its right — which was otherwise dead
              whitespace. Owner rejected giving YTD a line of its own (2026-07-30). */}
          <div className="mk-sum-solo-top">
            <div className="mk-sum-solo-main">
              <div className="mk-sum-label">
                {formatMessage({
                  id: 'investments.masthead.marketValue',
                  defaultMessage: 'Market value',
                })}
              </div>
              <div className="mk-sum-val mk-sum-hero mask" data-ctx-fact="Market value">
                {fBase(d.grand)}
              </div>
              {todayLine}
            </div>
            {ytd && (
              <div className="mk-sum-ytd" data-ctx-fact="YTD return">
                <div className="mk-sum-label">
                  {ytd.benchYtd != null
                    ? formatMessage(
                        { id: 'investments.masthead.ytdVs', defaultMessage: 'YTD vs {benchmark}' },
                        { benchmark: ytd.benchSym },
                      )
                    : formatMessage({ id: 'investments.masthead.ytd', defaultMessage: 'YTD' })}
                </div>
                <div className="mk-sum-ytd-pair">
                  <span className="mk-sum-ytd-val" style={{ color: tone(ytd.portYtd) }}>
                    {(ytd.portYtd >= 0 ? '+' : '') + (ytd.portYtd * 100).toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'}
                  </span>
                  {ytd.benchYtd != null && (
                    <span className="mk-sum-ytd-bench">
                      {(ytd.benchYtd >= 0 ? '+' : '') + (ytd.benchYtd * 100).toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'}
                    </span>
                  )}
                </div>
                {ytd.ahead != null && (
                  <div
                    className="mk-sum-ytd-sub"
                    style={{ color: ytd.ahead >= 0 ? 'var(--good)' : 'var(--bad)' }}
                  >
                    {formatMessage(
                      {
                        id: 'investments.masthead.aheadBehind',
                        defaultMessage:
                          '{points} pts {direction, select, ahead {ahead} other {behind}}',
                      },
                      {
                        points: (ytd.ahead >= 0 ? '+' : '−') + Math.abs(ytd.ahead).toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                        direction: ytd.ahead >= 0 ? 'ahead' : 'behind',
                      },
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {(totalPL !== 0 || pctNW > 0) && (
            <div className="mk-sum-meta">
              {totalPL !== 0 && (
                <span className="mk-sum-meta-item">
                  <span className="mk-sum-meta-k">
                    {formatMessage({ id: 'investments.masthead.pnl', defaultMessage: 'P&L' })}
                  </span>
                  <span
                    className="mask"
                    style={{ color: tone(totalPL), fontWeight: 600 }}
                    data-ctx-fact="Unrealized P&L"
                  >
                    {signed(totalPL, fBase)}
                  </span>
                  <span style={{ color: tone(totalPL) }}>
                    {signed(uplPct, (n) => n.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%')}
                  </span>
                </span>
              )}
              {portfolioTotal > 0 && (
                <span className="mk-sum-meta-item" data-ctx-fact="% of net worth">
                  {formatMessage(
                    {
                      id: 'investments.masthead.netWorth',
                      defaultMessage: '{percent}% of net worth',
                    },
                    { percent: pctNW.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) },
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mk-sum mk-sum--4">
      {/* Hero cell — Market value + sparkline */}
      <div className="mk-sum-cell">
        <div className="mk-sum-label">
          {formatMessage({
            id: 'investments.masthead.marketValue',
            defaultMessage: 'Market value',
          })}
        </div>
        <div className="mk-sum-c1">
          <div>
            <div className="mk-sum-val mk-sum-hero mask" data-ctx-fact="Market value">
              {fBase(d.grand)}
            </div>
            {portfolioTotal > 0 && (
              <div className="mk-sum-sub" data-ctx-fact="% of net worth">
                {formatMessage(
                  {
                    id: 'investments.masthead.netWorth',
                    defaultMessage: '{percent}% of net worth',
                  },
                  { percent: pctNW.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) },
                )}
              </div>
            )}
          </div>
          {hasSpark && (
            <div className="mk-spark-wrap">
              <Sparkline values={sparkValues!} up={up} width={150} height={38} />
              <span className="mk-spark-cap">
                {formatMessage({ id: 'investments.masthead.thirtyDays', defaultMessage: '30D' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Today — unique here; Portfolio brief is insights-only. */}
      <div className="mk-sum-cell">
        <div className="mk-sum-label">
          {formatMessage({ id: 'investments.masthead.today', defaultMessage: 'Today' })}
        </div>
        <div className="mk-sum-val mask" style={{ color: tone(totalDay) }} data-ctx-fact="Today">
          {signed(totalDay, fBase)}
        </div>
        <div className="mk-sum-sub" style={{ color: tone(totalDay) }}>
          {fPct(d.todayPct)}
        </div>
      </div>

      {/* YTD vs benchmark */}
      <div className="mk-sum-cell">
        <div className="mk-sum-label">
          {ytd?.benchYtd != null
            ? formatMessage(
                { id: 'investments.masthead.ytdVs', defaultMessage: 'YTD vs {benchmark}' },
                { benchmark: ytd.benchSym },
              )
            : formatMessage({ id: 'investments.masthead.ytdReturn', defaultMessage: 'YTD return' })}
        </div>
        {ytd ? (
          <>
            <div className="mk-sum-val mk-sum-val-pair" data-ctx-fact="YTD return">
              <span style={{ color: tone(ytd.portYtd) }}>
                {(ytd.portYtd >= 0 ? '+' : '') + (ytd.portYtd * 100).toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'}
              </span>
              {ytd.benchYtd != null && (
                <span className="mk-sum-bench">
                  {(ytd.benchYtd >= 0 ? '+' : '') + (ytd.benchYtd * 100).toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'}
                </span>
              )}
            </div>
            {ytd.ahead != null && (
              <div className="mk-sum-sub" style={{ color: tone(ytd.ahead) }}>
                {formatMessage(
                  {
                    id: 'investments.masthead.aheadBehind',
                    defaultMessage:
                      '{points} pts {direction, select, ahead {ahead} other {behind}}',
                  },
                  {
                    points: (ytd.ahead >= 0 ? '+' : '−') + Math.abs(ytd.ahead).toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                    direction: ytd.ahead >= 0 ? 'ahead' : 'behind',
                  },
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mk-sum-val" data-ctx-fact="YTD return">
            —
          </div>
        )}
      </div>

      {/* Unrealized P&L */}
      <div className="mk-sum-cell">
        <div className="mk-sum-label">
          {formatMessage({
            id: 'investments.masthead.unrealized',
            defaultMessage: 'Unrealized P&L',
          })}
        </div>
        <div
          className="mk-sum-val mask"
          style={{ color: tone(totalPL) }}
          data-ctx-fact="Unrealized P&L"
        >
          {totalPL !== 0 ? signed(totalPL, fBase) : '—'}
        </div>
        {totalPL !== 0 && (
          <div className="mk-sum-sub" style={{ color: tone(totalPL) }}>
            {signed(uplPct, (n) => n.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%')}
          </div>
        )}
      </div>
    </div>
  )
}
