import { equityError } from './equityErrors'
import { getNumberLocale } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useEffect, useState } from 'react'
import type { Grant, Tranche, FmvPrefill, VestApply, VestResult } from '../../../types/equity'
import {
  Modal,
  FormField,
  NumberField,
  TextField,
  Select,
  Stack,
  Cluster,
  Badge,
  Button,
  Text,
  Loading,
  ErrorState,
} from '../../ui'
import { authFetch } from '../../../api/client'
import { fCurrency, fDate } from '../../../utils/format'

interface Props {
  grant: Grant
  tranche: Tranche
  onClose: () => void
  onDone: () => void
}

type ModalPhase = 'form' | 'success' | 'error'

export function MarkVestModal({ grant, tranche, onClose, onDone }: Props) {
  const intl = useAppIntl()
  const [units, setUnits] = useState(String(tranche.units))
  const [fmvPerUnit, setFmvPerUnit] = useState('')
  const [fmvCurrency, setFmvCurrency] = useState(grant.currency || 'SGD')
  const [vestDate, setVestDate] = useState(tranche.vest_date)
  // Price paid per unit — 0 for RSUs; non-zero for ESPP/discounted purchases.
  const [pricePaid, setPricePaid] = useState('0')
  // Only collected for grants that deliver shares after vest; optional and never guessed.
  const [expectedRelease, setExpectedRelease] = useState('')
  const [fmvPrefill, setFmvPrefill] = useState<FmvPrefill | null>(null)
  const [fmvLoading, setFmvLoading] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState<ModalPhase>('form')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<VestResult | null>(null)

  // Fetch FMV prefill on modal open (§14 contract: GET /api/equity/grants/{id}/tranches/{tid}/fmv).
  useEffect(() => {
    let alive = true
    setFmvLoading(true)
    authFetch(`/api/equity/grants/${grant.id}/tranches/${tranche.id}/fmv`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: FmvPrefill) => {
        if (!alive) return
        setFmvPrefill(d)
        if (d.fmv_per_unit != null) setFmvPerUnit(String(d.fmv_per_unit))
        if (d.fmv_currency) setFmvCurrency(d.fmv_currency)
        setFmvLoading(false)
      })
      .catch(() => {
        if (!alive) return
        // No price found — empty editable field, broker statement wins.
        setFmvPrefill({
          fmv_per_unit: null,
          fmv_currency: grant.currency || 'SGD',
          as_of: null,
          source: 'none',
        })
        setFmvLoading(false)
      })
    return () => {
      alive = false
    }
  }, [grant.id, grant.currency, tranche.id])

  const unitsNum = parseFloat(units) || 0
  const fmvNum = parseFloat(fmvPerUnit) || 0
  const pricePaidNum = parseFloat(pricePaid) || 0
  const grossGain = unitsNum * (fmvNum - pricePaidNum)

  const isDeferred = grant.tax_event === 'deferred'
  const needsRelease = grant.release_required

  const canSubmit =
    !submitting &&
    unitsNum > 0 &&
    unitsNum <= tranche.units &&
    fmvNum > 0 &&
    vestDate.length === 10 &&
    phase === 'form'

  async function handleConfirm() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const body: VestApply & { price_paid_per_unit?: number } = {
      units: unitsNum,
      fmv_per_unit: fmvNum,
      fmv_currency: fmvCurrency,
      vest_date: vestDate,
      ...(pricePaidNum > 0 ? { price_paid_per_unit: pricePaidNum } : {}),
      ...(needsRelease && expectedRelease ? { expected_release_date: expectedRelease } : {}),
    }
    try {
      const res = await authFetch(`/api/equity/grants/${grant.id}/tranches/${tranche.id}/vest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(equityError(intl, detail, (detail as { detail?: string }).detail || `HTTP ${res.status}`))
      }
      const r: VestResult = await res.json()
      setResult(r)
      setPhase('success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : intl.formatMessage({ id: 'equity.vest.failed', defaultMessage: "Vest failed. Please try again." }))
      setSubmitting(false)
    }
  }

  const title = intl.formatMessage({ id: 'equity.vest.title', defaultMessage: 'Mark vested — {symbol} • {date} tranche' }, { symbol: grant.symbol, date: fDate(tranche.vest_date, 'short', 'always') })

  const fmvCaption =
    fmvPrefill?.source === 'price_history' && fmvPrefill.as_of
      ? intl.formatMessage({ id: 'equity.vest.prefilled', defaultMessage: 'Pre-filled from price history on {date}. Edit to match your broker statement.' }, { date: fDate(fmvPrefill.as_of, 'short', 'always') })
      : intl.formatMessage({ id: 'equity.vest.noPrice', defaultMessage: "No price history found for this date. Enter the FMV from your broker statement." })

  // ── Success body ──────────────────────────────────────────────────────────────

  if (phase === 'success' && result) {
    return (
      <Modal
        open
        onClose={onDone}
        title={title}
        size="lg"
        closeOnBackdrop={false}
        dragToDismiss
        footer={
          <Button variant="primary" onClick={onDone}>
            {intl.formatMessage({ id: 'equity.done', defaultMessage: 'Done' })}
          </Button>
        }
      >
        <Stack gap="--space-5">
          <Text as="p" size="base" tone="faint">
            {intl.formatMessage({ id: 'equity.vest.recorded', defaultMessage: "Vest recorded" })}
          </Text>
          <Text as="p" size="base">
            {needsRelease
              ? intl.formatMessage({ id: 'equity.vest.awaiting', defaultMessage: '{units} units are awaiting release — they count in your net worth but are not sellable yet. No cash moved: a vest delivers shares.' }, { units: unitsNum.toLocaleString(getNumberLocale()) })
              : intl.formatMessage({ id: 'equity.vest.lotCreated', defaultMessage: 'Lot created at {price} • {units} units moved to liquid. No cash moved: a vest delivers shares.' }, { price: fCurrency(fmvNum, fmvCurrency), units: unitsNum.toLocaleString(getNumberLocale()) })}
          </Text>
          {needsRelease && (
            <Text as="p" size="sm" tone="faint">
              {intl.formatMessage({ id: 'equity.vest.confirmedRelease', defaultMessage: 'Mark them released when they land in the account — the lot is created then, still at this vest date and price.' })}
            </Text>
          )}
          <Text as="p" size="sm" tone="faint">
            {intl.formatMessage({ id: 'equity.vest.undo', defaultMessage: 'To undo, use the Undo button on the grant detail or restore from the checkpoint in Lucius chat.' })}
          </Text>
        </Stack>
      </Modal>
    )
  }

  // ── Form body ─────────────────────────────────────────────────────────────────

  const footer = (
    <Cluster gap="--space-3" justify="between">
      <Button variant="secondary" onClick={onClose} disabled={submitting}>
        {intl.formatMessage({ id: 'equity.cancel', defaultMessage: 'Cancel' })}
      </Button>
      <Button variant="primary" onClick={handleConfirm} disabled={!canSubmit}>
        {submitting ? intl.formatMessage({ id: 'equity.saving', defaultMessage: 'Saving…' }) : intl.formatMessage({ id: 'equity.vest.confirm', defaultMessage: "Confirm vest" })}
      </Button>
    </Cluster>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="lg"
      closeOnBackdrop={false}
      dragToDismiss
      footer={footer}
    >
      <Stack gap="--space-5">
        <FormField
          label={intl.formatMessage({ id: 'equity.vest.units', defaultMessage: "Units" })}
          htmlFor="vest-units"
          help={intl.formatMessage({ id: 'equity.vest.maxUnits', defaultMessage: 'Max available: {units} unvested units' }, { units: tranche.units.toLocaleString(getNumberLocale()) })}
        >
          <NumberField
            id="vest-units"
            value={units}
            min={0.01}
            max={tranche.units}
            step={1}
            onChange={(e) => setUnits(e.target.value)}
          />
        </FormField>

        <FormField
          label={intl.formatMessage({ id: 'equity.vest.fmv', defaultMessage: "FMV per unit" })}
          htmlFor="vest-fmv"
          help={fmvLoading ? undefined : fmvCaption}
        >
          {fmvLoading ? (
            <Loading label={intl.formatMessage({ id: 'equity.vest.loading', defaultMessage: "Loading price history…" })} />
          ) : (
            <NumberField
              id="vest-fmv"
              value={fmvPerUnit}
              min={0}
              step={0.01}
              onChange={(e) => setFmvPerUnit(e.target.value)}
            />
          )}
        </FormField>

        <FormField
          label={intl.formatMessage({ id: 'equity.vest.pricePaid', defaultMessage: "Price paid per unit" })}
          htmlFor="vest-price-paid"
          help={intl.formatMessage({ id: 'equity.vest.pricePaidHelp', defaultMessage: "0 for RSUs — no cost. Set for ESPP or discounted purchase grants." })}
        >
          <NumberField
            id="vest-price-paid"
            value={pricePaid}
            min={0}
            step={0.01}
            onChange={(e) => setPricePaid(e.target.value)}
          />
        </FormField>

        <FormField label={intl.formatMessage({ id: 'equity.vest.currency', defaultMessage: "Currency" })} htmlFor="vest-currency">
          <Select
            id="vest-currency"
            value={fmvCurrency}
            onChange={(e) => setFmvCurrency(e.target.value)}
            options={[
              { value: 'SGD', label: 'SGD' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'HKD', label: 'HKD' },
              { value: 'GBP', label: 'GBP' },
              { value: fmvCurrency, label: fmvCurrency },
            ].filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i)}
          />
        </FormField>

        <FormField label={intl.formatMessage({ id: 'equity.vest.date', defaultMessage: "Vest date" })} htmlFor="vest-date">
          <TextField
            id="vest-date"
            type="date"
            value={vestDate}
            onChange={(e) => setVestDate(e.target.value)}
          />
        </FormField>

        {needsRelease && (
          <FormField
            label={intl.formatMessage({ id: 'equity.vest.expected', defaultMessage: "Expected release date" })}
            htmlFor="vest-expected-release"
            help={intl.formatMessage({ id: 'equity.vest.expectedHelp', defaultMessage: "Optional — when the shares are expected to land in the account. Leave blank if you don't know; it's only used to flag an overdue delivery." })}
          >
            <TextField
              id="vest-expected-release"
              type="date"
              value={expectedRelease}
              onChange={(e) => setExpectedRelease(e.target.value)}
            />
          </FormField>
        )}

        {/* Preview block — read-only */}
        {!fmvLoading && fmvNum > 0 && unitsNum > 0 && (
          <div className="equity-vest-preview">
            <Text as="p" size="sm" weight={600} className="equity-vest-preview__heading">
              {intl.formatMessage({ id: 'equity.vest.preview', defaultMessage: "Preview" })}
            </Text>
            <div className="equity-vest-preview__grid">
              <span className="equity-vest-preview__label">{intl.formatMessage({ id: 'equity.vest.grossGain', defaultMessage: "Gross gain" })}</span>
              <span className="equity-vest-preview__value">
                <Text as="span" size="md" weight={600}>
                  {fCurrency(grossGain, fmvCurrency)}
                </Text>{' '}
                <Text as="span" size="sm" tone="faint">
                  {unitsNum.toLocaleString(getNumberLocale())} × ({fmvNum.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} − {pricePaidNum.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </Text>
              </span>
              <span className="equity-vest-preview__label">{intl.formatMessage({ id: 'equity.vest.lot', defaultMessage: "Lot" })}</span>
              <span className="equity-vest-preview__value">
                <Text as="span" size="sm">
                  {intl.formatMessage({ id: 'equity.vest.lotDetails', defaultMessage: '{units} units @ {price} • acquired {date}' }, { units: unitsNum.toLocaleString(getNumberLocale()), price: fCurrency(fmvNum, fmvCurrency), date: fDate(vestDate, 'short', 'always') })}
                  {needsRelease && intl.formatMessage({ id: 'equity.vest.createdOnRelease', defaultMessage: ' • created when released' })}
                </Text>
              </span>
              <span className="equity-vest-preview__label">{intl.formatMessage({ id: 'equity.vest.units', defaultMessage: "Units" })}</span>
              <span className="equity-vest-preview__value">
                <Text as="span" size="sm">
                  {unitsNum.toLocaleString(getNumberLocale())}{' '}
                  {needsRelease ? intl.formatMessage({ id: 'equity.vest.lockedAwaiting', defaultMessage: 'locked → awaiting release' }) : intl.formatMessage({ id: 'equity.vest.lockedLiquid', defaultMessage: 'locked → liquid' })}
                </Text>
              </span>
            </div>
            <div className="equity-vest-preview__badge-row">
              {isDeferred ? (
                <Badge tone="warn">{intl.formatMessage({ id: 'equity.vest.deferred', defaultMessage: "Tax deferred" })}</Badge>
              ) : (
                <Badge tone="neutral">{intl.formatMessage({ id: 'equity.vest.taxed', defaultMessage: "Taxed at vest" })}</Badge>
              )}
              {needsRelease && <Badge tone="warn">{intl.formatMessage({ id: 'equity.vest.notSellable', defaultMessage: "Not sellable until released" })}</Badge>}
            </div>
          </div>
        )}

        {submitError && <ErrorState message={submitError} />}
      </Stack>
    </Modal>
  )
}
