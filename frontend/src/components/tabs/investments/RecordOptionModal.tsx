import { getNumberLocale } from '../../../utils/format'
import { useEffect, useMemo, useState } from 'react'
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import {
  Modal,
  FormField,
  NumberField,
  TextField,
  TextArea,
  Select,
  Stack,
  Cluster,
  Button,
  ErrorState,
  SegmentedControl,
} from '../../ui'
import { authFetch } from '../../../api/client'
import { openOption, DuplicateOptionError } from '../../../api/options'
import {
  STRATEGY_PRESETS,
  deriveFromPreset,
  totalPremium,
  cspCollateral,
  validateDraftKey,
  draftToPayload,
  type StrategyPreset,
  type OpenOptionDraft,
} from './optionForm'
import { ACCOUNTS_KEY, fetchJson } from '../../../hooks/serverState'
import { fetchCachedQuery } from '../../../state/queryCache'
import { presetMessages } from './optionPresetMessages'

const draftMessages = defineMessages({
  underlying: {
    id: 'recordOption.validation.underlying',
    defaultMessage: 'Pick the underlying instrument.',
  },
  account: {
    id: 'recordOption.validation.account',
    defaultMessage: 'Pick the securities account.',
  },
  strike: { id: 'recordOption.validation.strike', defaultMessage: 'Strike must be > 0.' },
  expiry: { id: 'recordOption.validation.expiry', defaultMessage: 'Pick the expiry date.' },
  contracts: { id: 'recordOption.validation.contracts', defaultMessage: 'Contracts must be > 0.' },
  multiplier: {
    id: 'recordOption.validation.multiplier',
    defaultMessage: 'Multiplier must be a positive whole number.',
  },
  premium: {
    id: 'recordOption.validation.premium',
    defaultMessage: 'Premium per share cannot be negative.',
  },
})

interface Props {
  onClose: () => void
  onDone: () => void
}

interface AccountLite {
  id: string
  name: string
  kind: string
  archived?: boolean
}

interface InstrumentLite {
  id: string
  symbol: string
  name?: string
  quote_currency?: string
}

function toLocalISODate(): string {
  const dt = new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function RecordOptionModal({ onClose, onDone }: Props) {
  const { formatMessage } = useAppIntl()
  const [accounts, setAccounts] = useState<AccountLite[]>([])
  const [instruments, setInstruments] = useState<InstrumentLite[]>([])
  const [preset, setPreset] = useState<StrategyPreset>('covered_call')
  const [optionType, setOptionType] = useState<'call' | 'put'>('call')
  const [side, setSide] = useState<'long' | 'short'>('short')
  const [underlyingId, setUnderlyingId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [strike, setStrike] = useState('')
  const [expiry, setExpiry] = useState('')
  const [contracts, setContracts] = useState('1')
  const [multiplier, setMultiplier] = useState('100')
  const [premiumPerShare, setPremiumPerShare] = useState('')
  const [premiumCurrency, setPremiumCurrency] = useState('')
  const [openDate, setOpenDate] = useState(toLocalISODate())
  const [premiumAccountId, setPremiumAccountId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCachedQuery<AccountLite[]>(ACCOUNTS_KEY, () => fetchJson<AccountLite[]>(ACCOUNTS_KEY))
      .then((rows) => setAccounts(rows.filter((a) => a.kind === 'asset' && !a.archived)))
      .catch(() => setAccounts([]))
    authFetch('/api/instruments')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: InstrumentLite[]) => setInstruments(rows))
      .catch(() => setInstruments([]))
  }, [])

  const derived = deriveFromPreset(preset)
  const effType = derived?.option_type ?? optionType
  const effSide = derived?.side ?? side
  const selectedInstrument = useMemo(
    () => instruments.find((i) => i.id === underlyingId),
    [instruments, underlyingId],
  )
  const effCurrency = premiumCurrency || selectedInstrument?.quote_currency || 'USD'

  const draft: OpenOptionDraft = {
    underlying_instrument_id: underlyingId,
    account_id: accountId,
    option_type: effType,
    side: effSide,
    strike,
    expiry,
    contracts,
    multiplier,
    premium_per_share: premiumPerShare,
    premium_currency: effCurrency,
    open_date: openDate,
    strategy_tag: derived?.strategy_tag ?? 'custom',
    strategy_preset: preset,
    premium_account_id: premiumAccountId,
    note,
  }

  const premiumTotal = totalPremium(
    Number(contracts) || 0,
    Number(multiplier) || 0,
    Number(premiumPerShare) || 0,
  )
  const collateral =
    preset === 'csp'
      ? cspCollateral(Number(strike) || 0, Number(contracts) || 0, Number(multiplier) || 0)
      : null

  async function submit(allowDuplicate: boolean) {
    const validation = validateDraftKey(draft)
    if (validation) {
      setError(formatMessage(draftMessages[validation]))
      return
    }
    setSubmitting(true)
    setError(null)
    setDuplicate(false)
    try {
      await openOption(draftToPayload({ ...draft, allow_duplicate: allowDuplicate }))
      onDone()
    } catch (e) {
      setDuplicate(e instanceof DuplicateOptionError)
      setError(
        e instanceof Error
          ? e.message
          : formatMessage({
              id: 'recordOption.ui.CouldNotRecordTheOption',
              defaultMessage: 'Could not record the option.',
            }),
      )
      setSubmitting(false)
    }
  }

  const footer = (
    <Cluster gap="--space-3" justify="between">
      <Button variant="ghost" onClick={onClose} disabled={submitting}>
        {formatMessage({ id: 'recordOption.ui.Cancel', defaultMessage: 'Cancel' })}
      </Button>
      <Cluster gap="--space-2">
        {duplicate && (
          <Button variant="secondary" onClick={() => void submit(true)} disabled={submitting}>
            {formatMessage({ id: 'recordOption.ui.RecordAnyway', defaultMessage: 'Record anyway' })}
          </Button>
        )}
        <Button variant="primary" onClick={() => void submit(false)} loading={submitting}>
          {formatMessage({ id: 'recordOption.ui.RecordOption', defaultMessage: 'Record option' })}
        </Button>
      </Cluster>
    </Cluster>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={formatMessage({ id: 'recordOption.ui.RecordOption', defaultMessage: 'Record option' })}
      size="lg"
      footer={footer}
    >
      <Stack gap="--space-4">
        <FormField
          label={formatMessage({ id: 'recordOption.ui.Strategy', defaultMessage: 'Strategy' })}
          htmlFor="opt-preset"
        >
          <Select
            id="opt-preset"
            value={preset}
            onChange={(e) => setPreset(e.target.value as StrategyPreset)}
            options={STRATEGY_PRESETS.map((p) => ({
              value: p.value,
              label: formatMessage(presetMessages[p.value]),
            }))}
            data-autofocus
          />
        </FormField>

        {preset === 'custom' && (
          <Cluster gap="--space-4">
            <FormField
              label={formatMessage({ id: 'recordOption.ui.Type', defaultMessage: 'Type' })}
            >
              <SegmentedControl
                ariaLabel={formatMessage({
                  id: 'recordOption.ui.OptionType',
                  defaultMessage: 'Option type',
                })}
                options={[
                  {
                    value: 'call',
                    label: formatMessage({ id: 'recordOption.ui.Call', defaultMessage: 'Call' }),
                  },
                  {
                    value: 'put',
                    label: formatMessage({ id: 'recordOption.ui.Put', defaultMessage: 'Put' }),
                  },
                ]}
                value={optionType}
                onChange={setOptionType}
              />
            </FormField>
            <FormField
              label={formatMessage({ id: 'recordOption.ui.Side', defaultMessage: 'Side' })}
              help={formatMessage({
                id: 'recordOption.ui.ShortWrittenSoldALiability',
                defaultMessage: 'Short = written/sold (a liability)',
              })}
            >
              <SegmentedControl
                ariaLabel={formatMessage({ id: 'recordOption.ui.Side', defaultMessage: 'Side' })}
                options={[
                  {
                    value: 'long',
                    label: formatMessage({ id: 'recordOption.ui.Long', defaultMessage: 'Long' }),
                  },
                  {
                    value: 'short',
                    label: formatMessage({ id: 'recordOption.ui.Short', defaultMessage: 'Short' }),
                  },
                ]}
                value={side}
                onChange={setSide}
              />
            </FormField>
          </Cluster>
        )}

        <FormField
          label={formatMessage({ id: 'recordOption.ui.Underlying', defaultMessage: 'Underlying' })}
          htmlFor="opt-underlying"
          required
        >
          <Select
            id="opt-underlying"
            value={underlyingId}
            onChange={(e) => setUnderlyingId(e.target.value)}
            options={[
              {
                value: '',
                label: formatMessage({
                  id: 'recordOption.ui.SelectAnInstrument',
                  defaultMessage: 'Select an instrument…',
                }),
              },
              ...instruments.map((i) => ({
                value: i.id,
                label: i.name ? `${i.symbol} — ${i.name}` : i.symbol,
              })),
            ]}
          />
        </FormField>

        <FormField
          label={formatMessage({ id: 'recordOption.ui.Account', defaultMessage: 'Account' })}
          htmlFor="opt-account"
          required
          help={formatMessage({
            id: 'recordOption.ui.SecuritiesAccountHoldingTheContractCustodianModel',
            defaultMessage: 'Securities account holding the contract (custodian model).',
          })}
        >
          <Select
            id="opt-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={[
              {
                value: '',
                label: formatMessage({
                  id: 'recordOption.ui.SelectAnAccount',
                  defaultMessage: 'Select an account…',
                }),
              },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </FormField>

        <Cluster gap="--space-4">
          <FormField
            label={formatMessage({ id: 'recordOption.ui.Strike', defaultMessage: 'Strike' })}
            htmlFor="opt-strike"
            required
          >
            <NumberField
              id="opt-strike"
              min={0}
              step="any"
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
            />
          </FormField>
          <FormField
            label={formatMessage({ id: 'recordOption.ui.Expiry', defaultMessage: 'Expiry' })}
            htmlFor="opt-expiry"
            required
          >
            <TextField
              id="opt-expiry"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </FormField>
          <FormField
            label={formatMessage({ id: 'recordOption.ui.Contracts', defaultMessage: 'Contracts' })}
            htmlFor="opt-contracts"
            required
          >
            <NumberField
              id="opt-contracts"
              min={0}
              step="any"
              value={contracts}
              onChange={(e) => setContracts(e.target.value)}
            />
          </FormField>
          <FormField
            label={formatMessage({
              id: 'recordOption.ui.Multiplier',
              defaultMessage: 'Multiplier',
            })}
            htmlFor="opt-multiplier"
            help={formatMessage({
              id: 'recordOption.ui.SharesPerContract',
              defaultMessage: 'Shares per contract',
            })}
          >
            <NumberField
              id="opt-multiplier"
              min={1}
              step={1}
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
            />
          </FormField>
        </Cluster>

        <Cluster gap="--space-4">
          <FormField
            label={formatMessage({
              id: 'recordOption.ui.PremiumShare',
              defaultMessage: 'Premium / share',
            })}
            htmlFor="opt-premium"
            help={formatMessage({
              id: 'recordOption.ui.OccQuote250On1Contract250Cash',
              defaultMessage: 'OCC quote: 2.50 on 1 contract = 250 cash',
            })}
          >
            <NumberField
              id="opt-premium"
              min={0}
              step="any"
              value={premiumPerShare}
              onChange={(e) => setPremiumPerShare(e.target.value)}
            />
          </FormField>
          <FormField
            label={formatMessage({ id: 'recordOption.ui.Currency', defaultMessage: 'Currency' })}
            htmlFor="opt-ccy"
          >
            <TextField
              id="opt-ccy"
              value={effCurrency}
              onChange={(e) => setPremiumCurrency(e.target.value.toUpperCase())}
            />
          </FormField>
          <FormField
            label={formatMessage({ id: 'recordOption.ui.OpenDate', defaultMessage: 'Open date' })}
            htmlFor="opt-open-date"
          >
            <TextField
              id="opt-open-date"
              type="date"
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
            />
          </FormField>
        </Cluster>

        <FormField
          label={formatMessage({
            id: 'recordOption.ui.BookPremiumCashLegTo',
            defaultMessage: 'Book premium cash leg to',
          })}
          htmlFor="opt-premium-account"
          help={
            effSide === 'short'
              ? formatMessage({
                  id: 'recordOption.ui.OptionalTheWalletTheReceivedPremiumLandsInBooksAnIncomeTransaction',
                  defaultMessage:
                    'Optional: the wallet the received premium lands in (books an income transaction).',
                })
              : formatMessage({
                  id: 'recordOption.ui.OptionalTheWalletThePaidPremiumLeavesFromBooksAnExpenseTransaction',
                  defaultMessage:
                    'Optional: the wallet the paid premium leaves from (books an expense transaction).',
                })
          }
        >
          <Select
            id="opt-premium-account"
            value={premiumAccountId}
            onChange={(e) => setPremiumAccountId(e.target.value)}
            options={[
              {
                value: '',
                label: formatMessage({
                  id: 'recordOption.ui.DonTBookACashLeg',
                  defaultMessage: "Don't book a cash leg",
                }),
              },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </FormField>

        <FormField
          label={formatMessage({ id: 'recordOption.ui.Note', defaultMessage: 'Note' })}
          htmlFor="opt-note"
        >
          <TextArea id="opt-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>

        <p className="opt-form-preview">
          {formatMessage({ id: 'recordOption.totalPremium', defaultMessage: 'Total premium:' })}{' '}
          <b>
            {premiumTotal.toLocaleString(getNumberLocale())} {effCurrency}
          </b>
          {collateral != null && collateral > 0 && (
            <>
              {' • '}
              {formatMessage({
                id: 'recordOption.collateral',
                defaultMessage: 'CSP collateral:',
              })}{' '}
              <b>
                {collateral.toLocaleString(getNumberLocale())} {effCurrency}
              </b>
            </>
          )}
        </p>

        {error && <ErrorState message={error} />}
      </Stack>
    </Modal>
  )
}
