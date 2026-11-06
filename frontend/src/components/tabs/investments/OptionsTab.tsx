import { getNumberLocale } from '../../../utils/format'
import { EntityRow } from '../../../lucius/EntityRow'
import { useState } from 'react'
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import './options.css'
import {
  SummaryBar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Modal,
  Cluster,
  TabSkeleton,
} from '../../ui'
import { ChartCandlestick } from '../../../ui/icons'
import type { StatCard } from '../../ui'
import { fDate, plClass } from '../../../utils/format'
import { useOptionsView } from './useOptionsView'
import type { OptionPosition } from './useOptionsView'
import { Spark } from '../../../lucius/identity'
import { RecordOptionModal } from './RecordOptionModal'
import { CloseOptionModal } from './CloseOptionModal'
import { LuciusCta } from '../../intro/LuciusCta'
import { deleteOption } from '../../../api/options'
import { presetMessages } from './optionPresetMessages'

const summaryMessages = defineMessages({
  open: { id: 'options.summary.open', defaultMessage: 'Open positions' },
  premium: { id: 'options.summary.premium', defaultMessage: 'Premium collected' },
  capital: { id: 'options.summary.capital', defaultMessage: 'Capital committed' },
  expiry: { id: 'options.summary.expiry', defaultMessage: 'Nearest expiry' },
})

interface Props {
  onAskLucius?: (text: string) => void
}

// Format a signed monetary amount with real typographic minus (−).
function fSigned(n: number, baseCurrency: string): string {
  const abs = new Intl.NumberFormat(getNumberLocale(), {
    style: 'currency',
    currency: baseCurrency,
    maximumFractionDigits: 0,
  }).format(Math.round(Math.abs(n)))
  return (n >= 0 ? '+' : '−') + abs
}

interface SectionProps {
  title: string
  sub: string
  positions: OptionPosition[]
  baseCurrency: string
  onCloseRow: (p: OptionPosition) => void
  onDeleteRow: (p: OptionPosition) => void
}

function OptionsSection({
  title,
  sub,
  positions,
  baseCurrency,
  onCloseRow,
  onDeleteRow,
}: SectionProps) {
  const { formatMessage } = useAppIntl()
  if (!positions.length) return null
  return (
    <div className="mk-panel">
      <div className="mk-panel-head">
        <span className="mk-panel-title">{title}</span>
        <span className="mk-panel-spacer" />
        <span className="mk-panel-sub">{sub}</span>
      </div>
      <div className="mk-panel-body" style={{ overflowX: 'auto' }}>
        <table className="opt-tbl">
          <thead>
            <tr>
              <th>{formatMessage({ id: 'options.ui.Position', defaultMessage: 'Position' })}</th>
              <th>{formatMessage({ id: 'options.ui.Contract', defaultMessage: 'Contract' })}</th>
              <th>{formatMessage({ id: 'options.ui.Expiry', defaultMessage: 'Expiry' })}</th>
              <th className="num">
                {formatMessage({ id: 'options.ui.Premium', defaultMessage: 'Premium' })}
              </th>
              <th className="num">
                {formatMessage({ id: 'options.ui.OpenPL', defaultMessage: 'Open P&L' })}
              </th>
              <th>{formatMessage({ id: 'options.ui.Status', defaultMessage: 'Status' })}</th>
              <th
                aria-label={formatMessage({ id: 'options.ui.Actions', defaultMessage: 'Actions' })}
              />
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <EntityRow
                as="tr"
                key={p.id}
                type="option_contract"
                id={p.id}
                label={`${p.underlying_symbol} ${p.strike}${p.option_type.slice(0, 1).toUpperCase()} ${fDate(p.expiry, 'short', 'always')}`}
                item={p}
                toFields={(it) => ({
                  underlying: it.underlying_symbol,
                  option_type: it.option_type,
                  side: it.side,
                  strike: it.strike,
                  expiry: it.expiry,
                  contracts: it.contracts,
                })}
                search={`${p.underlying_symbol} ${p.option_type} ${p.strategy_tag}`}
                sublabel={`${p.side === 'short' ? formatMessage({ id: 'options.side.short', defaultMessage: 'short' }) : p.side === 'long' ? formatMessage({ id: 'options.side.long', defaultMessage: 'long' }) : p.side} • ${fDate(p.expiry, 'short', 'always')}`}
              >
                <td>
                  <span className="opt-under">{p.underlying_symbol}</span>
                  <span className="opt-strat">
                    {p.strategy_preset && Object.hasOwn(presetMessages, p.strategy_preset)
                      ? formatMessage(presetMessages[p.strategy_preset])
                      : p.strategy_tag}
                  </span>
                  <div className="opt-note">{p.note}</div>
                </td>
                <td>
                  <span className="opt-contract">
                    {(p.side === 'short' ? '−' : '+') + p.contracts}{' '}
                    {p.option_type === 'CALL'
                      ? formatMessage({ id: 'closeOption.call', defaultMessage: 'CALL' })
                      : p.option_type === 'PUT'
                        ? formatMessage({ id: 'closeOption.put', defaultMessage: 'PUT' })
                        : p.option_type}{' '}
                    @ {p.strike.toLocaleString(getNumberLocale())}
                  </span>
                </td>
                <td>
                  <span className="opt-contract">{fDate(p.expiry, 'short', 'always')}</span>
                  <span className={'opt-dte' + (p.dte <= 14 ? ' soon' : '')}>
                    {formatMessage(
                      { id: 'options.days', defaultMessage: '{days}d' },
                      { days: p.dte },
                    )}
                  </span>
                </td>
                <td className={`num money ${plClass(p.premium)}`}>
                  {fSigned(p.premium, baseCurrency)}
                </td>
                <td className={`num money ${plClass(p.mark)}`}>{fSigned(p.mark, baseCurrency)}</td>
                <td>
                  <Badge tone={p.status === 'ITM' ? 'warn' : 'muted'}>
                    {p.status === 'ITM'
                      ? formatMessage({ id: 'options.itm', defaultMessage: 'ITM' })
                      : p.status === 'OTM'
                        ? formatMessage({ id: 'options.otm', defaultMessage: 'OTM' })
                        : p.status}
                  </Badge>
                </td>
                <td className="opt-row-actions">
                  <Button variant="ghost" size="dense" onClick={() => onCloseRow(p)}>
                    {formatMessage({ id: 'options.ui.Close', defaultMessage: 'Close' })}
                  </Button>
                  <Button variant="ghost" size="dense" onClick={() => onDeleteRow(p)}>
                    {formatMessage({ id: 'options.ui.Delete', defaultMessage: 'Delete' })}
                  </Button>
                </td>
              </EntityRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const OPTIONS_MESSAGE =
  'Help me record my options. Ask whether they are covered calls, cash-secured puts or long ' +
  'options; I can send a screenshot or statement of my positions instead of typing. Ask me one ' +
  'thing at a time.'

export function OptionsTab({ onAskLucius }: Props) {
  const { formatMessage } = useAppIntl()
  const {
    baseCurrency,
    summaryCards,
    incomePositions,
    hedgePositions,
    netMark,
    loading,
    error,
    refetch,
  } = useOptionsView()
  const [recording, setRecording] = useState(false)
  const [closing, setClosing] = useState<OptionPosition | null>(null)
  const [deleting, setDeleting] = useState<OptionPosition | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  if (loading) {
    return (
      <TabSkeleton
        variant="options"
        label={formatMessage({
          id: 'options.ui.LoadingOptions',
          defaultMessage: 'Loading options…',
        })}
        header={false}
      />
    )
  }

  if (error) {
    return (
      <ErrorState
        message={formatMessage({
          id: 'options.ui.CouldNotLoadOptionsPositions',
          defaultMessage: 'Could not load options positions.',
        })}
        onRetry={refetch}
      />
    )
  }

  const hasPositions = incomePositions.length > 0 || hedgePositions.length > 0
  const done = () => {
    setRecording(false)
    setClosing(null)
    refetch()
  }
  const openDelete = (p: OptionPosition | null) => {
    setDeleteError(null)
    setDeleting(p)
  }

  const modals = (
    <>
      {recording && <RecordOptionModal onClose={() => setRecording(false)} onDone={done} />}
      {closing && (
        <CloseOptionModal position={closing} onClose={() => setClosing(null)} onDone={done} />
      )}
      {deleting && (
        <Modal
          open
          onClose={() => openDelete(null)}
          title={formatMessage({
            id: 'options.ui.DeleteOptionEntry',
            defaultMessage: 'Delete option entry',
          })}
          size="sm"
          footer={
            <Cluster gap="--space-3" justify="between">
              <Button variant="ghost" onClick={() => openDelete(null)} disabled={deleteBusy}>
                {formatMessage({ id: 'options.ui.Cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button
                variant="danger"
                loading={deleteBusy}
                onClick={() => {
                  setDeleteBusy(true)
                  setDeleteError(null)
                  deleteOption(deleting.id)
                    .then(() => {
                      setDeleting(null)
                      setDeleteBusy(false)
                      refetch()
                    })
                    .catch((e) => {
                      setDeleteError(
                        e instanceof Error
                          ? e.message
                          : formatMessage({
                              id: 'options.ui.DeleteFailed',
                              defaultMessage: 'Delete failed.',
                            }),
                      )
                      setDeleteBusy(false)
                    })
                }}
              >
                {formatMessage({ id: 'options.ui.Delete', defaultMessage: 'Delete' })}
              </Button>
            </Cluster>
          }
        >
          <p className="opt-close-line">
            {formatMessage(
              {
                id: 'options.deleteWarning',
                defaultMessage:
                  'Removes the mistaken entry {symbol} {type} @ {strike} — it does NOT book any cash leg. A genuine exit should use Close instead.',
              },
              {
                symbol: deleting.underlying_symbol,
                type:
                  deleting.option_type === 'CALL'
                    ? formatMessage({ id: 'closeOption.call', defaultMessage: 'CALL' })
                    : deleting.option_type === 'PUT'
                      ? formatMessage({ id: 'closeOption.put', defaultMessage: 'PUT' })
                      : deleting.option_type,
                strike: deleting.strike.toLocaleString(getNumberLocale()),
              },
            )}
          </p>
          {deleteError && <ErrorState message={deleteError} />}
        </Modal>
      )}
    </>
  )

  if (!hasPositions) {
    return (
      <>
        <EmptyState
          fill
          icon={<ChartCandlestick size={28} strokeWidth={1.5} aria-hidden="true" />}
          title={formatMessage({
            id: 'options.ui.NoOptionsPositions',
            defaultMessage: 'No options positions',
          })}
          body={formatMessage({
            id: 'options.ui.CoveredCallsCashSecuredPutsAndHedgesWillAppearHereWithExpiryCountdownsStrikesAndOpenPL',
            defaultMessage:
              'Covered calls, cash-secured puts and hedges will appear here — with expiry countdowns, strikes and open P&L.',
          })}
          action={
            <Cluster gap="--space-3" justify="center">
              <Button variant="primary" size="sm" onClick={() => setRecording(true)}>
                {formatMessage({ id: 'options.ui.RecordOption', defaultMessage: 'Record option' })}
              </Button>
              <LuciusCta
                label={formatMessage({
                  id: 'options.ui.AddWithLucius',
                  defaultMessage: 'Add with Lucius',
                })}
                message={OPTIONS_MESSAGE}
                onAskLucius={onAskLucius}
              />
            </Cluster>
          }
        />
        {modals}
      </>
    )
  }

  const cards: StatCard[] = summaryCards.map((c) => ({
    label: formatMessage(summaryMessages[c.labelKey]),
    value: c.value,
    caption: c.captionParts
      ? formatMessage(
          { id: 'options.nearestCaption', defaultMessage: '{days}d • {symbol}' },
          c.captionParts,
        )
      : undefined,
  }))

  return (
    <div className="mk-subt">
      <div className="opt-toolbar">
        <Button variant="primary" size="sm" onClick={() => setRecording(true)}>
          {formatMessage({ id: 'remaining.recordOption', defaultMessage: 'Record option' })}
        </Button>
      </div>
      <SummaryBar cards={cards} />

      <OptionsSection
        title={formatMessage({
          id: 'options.ui.IncomeOverlays',
          defaultMessage: 'Income overlays',
        })}
        sub={formatMessage({
          id: 'options.ui.CoveredCallsCashSecuredPutsPremiumYouCollectAgainstHoldings',
          defaultMessage:
            'covered calls • cash-secured puts — premium you collect against holdings',
        })}
        positions={incomePositions}
        baseCurrency={baseCurrency}
        onCloseRow={setClosing}
        onDeleteRow={openDelete}
      />

      <OptionsSection
        title={formatMessage({
          id: 'options.ui.DirectionalHedges',
          defaultMessage: 'Directional & hedges',
        })}
        sub={formatMessage({
          id: 'options.ui.LongPutsProtectLongCallsAddUpsideRiskIsCappedAtPremiumPaid',
          defaultMessage:
            'long puts protect, long calls add upside — risk is capped at premium paid',
        })}
        positions={hedgePositions}
        baseCurrency={baseCurrency}
        onCloseRow={setClosing}
        onDeleteRow={openDelete}
      />

      <div className="mk-panel">
        <div
          className="mk-panel-body"
          style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          <span className="mk-field-help" style={{ flex: 1, minWidth: 220 }}>
            {formatMessage(
              {
                id: 'options.netMark',
                defaultMessage:
                  'Net open P&L across all option positions is <amount>{value}</amount>. Premium decays in your favour on the short overlays as expiry nears.',
              },
              {
                value: fSigned(netMark, baseCurrency),
                amount: (chunks) => <b className={`money ${plClass(netMark)}`}>{chunks}</b>,
              },
            )}
          </span>
          <Button
            size="sm"
            variant="primary"
            className="fi-lucius"
            iconLeft={<Spark size={15} ariaHidden />}
            onClick={() => onAskLucius?.('Tell me about my options positions and assignment risk.')}
          >
            {formatMessage({
              id: 'options.ui.AskLuciusAboutOptions',
              defaultMessage: 'Ask Lucius about options',
            })}
          </Button>
        </div>
      </div>
      {modals}
    </div>
  )
}
