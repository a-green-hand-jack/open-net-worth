import { equityError } from './equityErrors'
import { getNumberLocale } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useState } from 'react'
import type { PendingReleaseItem, ReleaseResult } from '../../../types/equity'
import { Modal, FormField, TextField, Stack, Cluster, Button, Text, ErrorState } from '../../ui'
import { authFetch } from '../../../api/client'
import { fCurrency, fDate, localIso } from '../../../utils/format'

interface Props {
  item: PendingReleaseItem
  onClose: () => void
  onDone: () => void
}

type ModalPhase = 'form' | 'success'

/** Confirms that a pending vest's shares have actually been DELIVERED.
 *  Deliberately asks for one thing — the date they landed. It moves shares only: no
 *  transaction is written and the lot keeps the vest-date basis, so there is nothing
 *  else for the operator to get wrong here. */
export function MarkReleasedModal({ item, onClose, onDone }: Props) {
  const intl = useAppIntl()
  const recordsLegacyDateOnly = item.release_mode === 'record_only'
  const today = localIso()
  const [releaseDate, setReleaseDate] = useState(
    item.expected_release_date && item.expected_release_date <= today
      ? item.expected_release_date
      : today,
  )
  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState<ModalPhase>('form')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ReleaseResult | null>(null)

  // The vest date is the floor: shares cannot be delivered before they vest.
  const canSubmit =
    !submitting && releaseDate.length === 10 && releaseDate >= item.vest_date && phase === 'form'

  async function handleConfirm() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await authFetch(`/api/equity/vest-events/${item.vest_event_id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ release_date: releaseDate }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(equityError(intl, detail, (detail as { detail?: string }).detail || `HTTP ${res.status}`))
      }
      setResult(await res.json())
      setPhase('success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : intl.formatMessage({ id: 'equity.release.failed', defaultMessage: 'Release failed. Please try again.' }))
      setSubmitting(false)
    }
  }

  const title = intl.formatMessage({ id: 'equity.release.title', defaultMessage: 'Mark released — {symbol} • {date} vest' }, { symbol: item.symbol, date: fDate(item.vest_date, 'short', 'always') })

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
            {recordsLegacyDateOnly ? intl.formatMessage({ id: 'equity.release.recorded', defaultMessage: 'Release recorded' }) : intl.formatMessage({ id: 'equity.release.delivered', defaultMessage: 'Shares delivered' })}
          </Text>
          <Text as="p" size="base">
            {recordsLegacyDateOnly
              ? intl.formatMessage({ id: 'equity.release.legacySuccess', defaultMessage: '{units} units keep their existing vest-date lot; the delivery date is now recorded.' }, { units: item.units.toLocaleString(getNumberLocale()) })
              : intl.formatMessage({ id: 'equity.release.success', defaultMessage: '{units} units are now sellable holdings, at a cost basis of {price} per unit from the {date} vest.' }, { units: item.units.toLocaleString(getNumberLocale()), price: fCurrency(item.fmv_per_unit, item.fmv_currency), date: fDate(item.vest_date, 'short', 'always') })}
          </Text>
          <Text as="p" size="sm" tone="faint">
            {recordsLegacyDateOnly
              ? intl.formatMessage({ id: 'equity.release.legacyNoChange', defaultMessage: 'No shares or money were added — the existing lot and any earlier transactions remain unchanged.' })
              : intl.formatMessage({ id: 'equity.release.noCash', defaultMessage: 'No cash transaction was written — this release moves shares and preserves their vest-date cost basis.' })}
          </Text>
        </Stack>
      </Modal>
    )
  }

  const footer = (
    <Cluster gap="--space-3" justify="between">
      <Button variant="secondary" onClick={onClose} disabled={submitting}>
        {intl.formatMessage({ id: 'equity.cancel', defaultMessage: 'Cancel' })}
      </Button>
      <Button variant="primary" onClick={handleConfirm} disabled={!canSubmit}>
        {submitting ? intl.formatMessage({ id: 'equity.saving', defaultMessage: 'Saving…' }) : intl.formatMessage({ id: 'equity.release.confirm', defaultMessage: 'Confirm release' })}
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
        <Text as="p" size="sm" tone="faint">
          {intl.formatMessage({ id: 'equity.release.vested', defaultMessage: '{units} units vested on {date}' }, { units: item.units.toLocaleString(getNumberLocale()), date: fDate(item.vest_date, 'short', 'always') })}
          {item.expected_release_date ? intl.formatMessage({ id: 'equity.release.expected', defaultMessage: ' • expected {date}' }, { date: fDate(item.expected_release_date, 'short', 'always') }) : ''}.{' '}
          {recordsLegacyDateOnly
            ? intl.formatMessage({ id: 'equity.release.legacyExplanation', defaultMessage: 'This legacy vest already has its vest-date lot. Marking it released records when the shares landed without adding shares or changing money.' })
            : intl.formatMessage({ id: 'equity.release.explanation', defaultMessage: 'Marking them released moves them into your sellable holdings. Nothing about the money changes — the lot keeps the vest date and the {price} vest-date price.' }, { price: fCurrency(item.fmv_per_unit, item.fmv_currency) })}
        </Text>

        <FormField
          label={intl.formatMessage({ id: 'equity.release.date', defaultMessage: 'Release date' })}
          htmlFor="release-date"
          help={intl.formatMessage({ id: 'equity.release.dateHelp', defaultMessage: 'The day the shares landed in the account. Cannot be before the {date} vest date.' }, { date: fDate(item.vest_date, 'short', 'always') })}
        >
          <TextField
            id="release-date"
            type="date"
            min={item.vest_date}
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
          />
        </FormField>

        {releaseDate.length === 10 && releaseDate < item.vest_date && (
          <Text as="p" size="sm" tone="bad">
            {intl.formatMessage({ id: 'equity.release.beforeVest', defaultMessage: "Shares can't be delivered before they vest." })}
          </Text>
        )}

        {submitError && <ErrorState message={submitError} />}
      </Stack>
    </Modal>
  )
}
