// Risk — concentration & risk panel. Verbatim port of prototype Risk() (non-editing view).
// Shows top 5 single-name concentrations with flag when a position exceeds the guideline.

import { useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { fBase } from '../../../utils/format'
import { Button, Badge } from '../../ui'

interface RiskRow {
  nm: string
  pct: number
  val: number
  hot: boolean
}

interface Props {
  risk: RiskRow[]
  grand: number
  guideline?: number
  dropPct?: number
  onSaveSettings?: (s: { guideline: number; dropPct: number }) => void
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

export function Risk({ risk, guideline = 20, dropPct = 30, onSaveSettings }: Props) {
  const { formatMessage } = useAppIntl()
  const [editing, setEditing] = useState(false)
  const [g, setG] = useState(guideline)
  const [dp, setDp] = useState(dropPct)

  const max = Math.max(...risk.map((r) => r.pct), 1)
  // `hot` is the server's one breach rule (investments_book.concentration_by_name); the
  // browser re-deriving it from `guideline` is how a second rule grows.
  const flagged = risk.find((r) => r.hot)
  const flagCount = risk.filter((r) => r.hot).length
  const dropCost = flagged ? flagged.val * (dropPct / 100) : 0

  if (editing) {
    return (
      <Card
        title={formatMessage({
          id: 'investmentRisk.RiskSettings',
          defaultMessage: 'Risk settings',
        })}
      >
        <div className="mk-tgt-edit">
          <div className="mk-set-row">
            <span className="mk-set-lbl">
              {formatMessage({
                id: 'investmentRisk.SingleNameGuideline',
                defaultMessage: 'Single-name guideline',
              })}
              <span className="mk-set-sub">
                {formatMessage({
                  id: 'investmentRisk.FlagAnyHoldingAboveThisShare',
                  defaultMessage: 'Flag any holding above this share',
                })}
              </span>
            </span>
            <span className="mk-set-field">
              <input
                className="mk-tgt-input"
                type="number"
                min="1"
                max="100"
                value={g}
                onChange={(e) =>
                  setG(
                    e.target.value === '' ? 0 : Math.max(1, Math.min(100, Number(e.target.value))),
                  )
                }
              />
              %
            </span>
          </div>
          <div className="mk-set-row">
            <span className="mk-set-lbl">
              {formatMessage({
                id: 'investmentRisk.StressScenario',
                defaultMessage: 'Stress scenario',
              })}
              <span className="mk-set-sub">
                {formatMessage({
                  id: 'investmentRisk.HypotheticalPriceDropForTheLossEstimate',
                  defaultMessage: 'Hypothetical price drop for the loss estimate',
                })}
              </span>
            </span>
            <span className="mk-set-field">
              <input
                className="mk-tgt-input"
                type="number"
                min="1"
                max="100"
                value={dp}
                onChange={(e) =>
                  setDp(
                    e.target.value === '' ? 0 : Math.max(1, Math.min(100, Number(e.target.value))),
                  )
                }
              />
              %
            </span>
          </div>
        </div>
        <div className="mk-tgt-foot">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onSaveSettings?.({ guideline: g || 20, dropPct: dp || 30 })
              setEditing(false)
            }}
          >
            {formatMessage({ id: 'investmentRisk.Save', defaultMessage: 'Save' })}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            {formatMessage({ id: 'investmentRisk.Cancel', defaultMessage: 'Cancel' })}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={formatMessage({
        id: 'investmentRisk.ConcentrationRisk',
        defaultMessage: 'Concentration & risk',
      })}
      meta={
        <span className="mk-risk-meta">
          {flagged ? (
            <Badge tone="warn">
              {formatMessage(
                {
                  id: 'investmentRisk.flags',
                  defaultMessage: '{count, plural, one {# flag} other {# flags}}',
                },
                { count: flagCount },
              )}
            </Badge>
          ) : (
            <Badge tone="pos">
              {formatMessage({ id: 'investmentRisk.Ok', defaultMessage: 'OK' })}
            </Badge>
          )}
          <button
            className="mk-card-edit"
            style={{ marginLeft: 0 }}
            onClick={() => setEditing(true)}
          >
            {formatMessage({ id: 'investmentRisk.Adjust', defaultMessage: 'Adjust' })}
          </button>
        </span>
      }
    >
      <div className="mk-risk">
        {risk.map((r) => {
          const hot = r.hot
          return (
            <div className="mk-risk-row" key={r.nm}>
              <span className="mk-risk-nm">{r.nm}</span>
              <span className="mk-risk-track">
                <span
                  className="mk-risk-fill"
                  style={{
                    width: (r.pct / max) * 100 + '%',
                    background: hot ? 'var(--warn)' : 'var(--muted)',
                  }}
                />
              </span>
              <span className="mk-risk-pct" style={{ color: hot ? 'var(--warn)' : 'var(--ink)' }}>
                {Math.round(r.pct)}%
              </span>
            </div>
          )
        })}
      </div>
      {flagged && (
        <div className="mk-stress">
          <span className="mk-stress-mark">⚠</span>
          <span>
            {formatMessage(
              {
                id: 'investmentRisk.stress',
                defaultMessage: 'Stress test • a {drop}% drop in {name} ≈ <amount>{loss}</amount>',
              },
              {
                drop: Math.round(dropPct),
                name: flagged.nm,
                loss: '−' + fBase(dropCost),
                amount: (chunks) => <b className="mask">{chunks}</b>,
              },
            )}
          </span>
        </div>
      )}
    </Card>
  )
}
