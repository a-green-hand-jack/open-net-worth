import { equityError } from './equityErrors'
import { getNumberLocale } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useEffect, useState } from 'react'
import type {
  GrantCreate,
  GrantType,
  TaxEvent,
  TrancheInput,
  TrancheKind,
} from '../../../types/equity'
import {
  Modal,
  FormField,
  NumberField,
  TextField,
  Select,
  Stack,
  Cluster,
  Button,
  Text,
  ErrorState,
  SegmentedControl,
} from '../../ui'
import { authFetch } from '../../../api/client'
import { fDate } from '../../../utils/format'
import { eqLuciusParse, eqGenSchedule, countParsedFields } from './scheduleGen'
import type { Frequency, GeneratedTranche } from './scheduleGen'
import { ACCOUNTS_KEY, fetchJson } from '../../../hooks/serverState'
import { fetchCachedQuery } from '../../../state/queryCache'
import { X, Plus, ChevronDown, ChevronRight } from '../../../ui/icons'

interface Props {
  onClose: () => void
  onDone: () => void
}

interface AccountLite {
  id: string
  name: string
  kind: string
}

interface InstrumentLite {
  id: string
  symbol: string
  quote_currency?: string
}

interface TrancheRow extends TrancheInput {
  _key: number
}

function toLocalISODate(): string {
  const dt = new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

let _key = 0
function nextKey() {
  return ++_key
}

function emptyTranche(): TrancheRow {
  return { _key: nextKey(), vest_date: '', units: 0, kind: 'time' }
}

// ESOW is functionally an RSU-equivalent on the backend schema (both are kind="rsu").
// We surface "ESOW" as a display-only label and send "rsu" to the API.
function grantTypeApiValue(uiValue: string): GrantType {
  if (uiValue === 'ltip') return 'ltip'
  return 'rsu' // 'rsu' and 'esow' both map to 'rsu'
}

const NEW_ACCOUNT_SENTINEL = '__new__'

type Mode = 'schedule' | 'manual'

export function AddGrantModal({ onClose, onDone }: Props) {
  const intl = useAppIntl()
  const [symbol, setSymbol] = useState('')
  const [instrumentId, setInstrumentId] = useState<string | null>(null)
  const [symbolError, setSymbolError] = useState<string | null>(null)
  const [grantDate, setGrantDate] = useState(toLocalISODate())
  const [grantPricePerUnit, setGrantPricePerUnit] = useState<number | null>(null)
  const [grantTypeUi, setGrantTypeUi] = useState('rsu')
  const [taxEvent, setTaxEvent] = useState<TaxEvent>('at_vest')
  // Opt-in: most plans deliver shares the moment they vest, so this defaults off.
  const [releaseRequired, setReleaseRequired] = useState(false)
  // '' = no selection (required), NEW_ACCOUNT_SENTINEL = user wants to type a new name
  const [accountId, setAccountId] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [tranches, setTranches] = useState<TrancheRow[]>([emptyTranche()])

  // Grant text paste-box state
  const [pasteText, setPasteText] = useState('')
  const [parsedCount, setParsedCount] = useState<number | null>(null)

  // Mode: schedule generator vs manual entry
  const [mode, setMode] = useState<Mode>('schedule')

  // Schedule generator inputs
  const [schedTotalUnits, setSchedTotalUnits] = useState('')
  const [schedFreq, setSchedFreq] = useState<Frequency>('quarterly')
  const [schedYears, setSchedYears] = useState('')
  const [schedFirstVest, setSchedFirstVest] = useState('')
  const [schedPreviewOpen, setSchedPreviewOpen] = useState(false)

  // Advanced disclosure
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [accounts, setAccounts] = useState<AccountLite[]>([])
  const [instruments, setInstruments] = useState<InstrumentLite[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch accounts and instruments for selectors.
  useEffect(() => {
    let alive = true
    fetchCachedQuery<AccountLite[]>(ACCOUNTS_KEY, () => fetchJson<AccountLite[]>(ACCOUNTS_KEY))
      .then((data) => {
        if (!alive) return
        setAccounts(data.filter((a) => a.kind === 'asset'))
      })
      .catch(() => {})
    authFetch('/api/instruments')
      .then((r) => (r.ok ? r.json() : Promise.resolve([])))
      .then((data: InstrumentLite[]) => {
        if (!alive) return
        setInstruments(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  function resolveSymbol(raw: string) {
    const upper = raw.trim().toUpperCase()
    if (!upper) {
      setInstrumentId(null)
      setSymbolError(null)
      return
    }
    const match = instruments.find((i) => i.symbol.toUpperCase() === upper)
    if (match) {
      setInstrumentId(match.id)
      setSymbolError(null)
    } else {
      setInstrumentId(null)
      setSymbolError(intl.formatMessage({ id: 'equity.unknownInstrument', defaultMessage: 'Unknown instrument — add it under Investments first.' }))
    }
  }

  function handleFillFromText() {
    const parsed = eqLuciusParse(pasteText)
    const count = countParsedFields(parsed)
    setParsedCount(count)
    if (count === 0) return
    if (parsed.symbol) {
      setSymbol(parsed.symbol)
      resolveSymbol(parsed.symbol)
    }
    if (parsed.totalUnits) setSchedTotalUnits(parsed.totalUnits)
    if (parsed.freq) setSchedFreq(parsed.freq)
    if (parsed.years) setSchedYears(parsed.years)
    if (parsed.firstVest) setSchedFirstVest(parsed.firstVest)
  }

  function updateTranche(key: number, patch: Partial<TrancheRow>) {
    setTranches((prev) => prev.map((t) => (t._key === key ? { ...t, ...patch } : t)))
  }

  function addTranche() {
    setTranches((prev) => [...prev, emptyTranche()])
  }

  function removeTranche(key: number) {
    setTranches((prev) => prev.filter((t) => t._key !== key))
  }

  // Generated schedule (live-computed from generator inputs)
  const generatedTranches: GeneratedTranche[] = (() => {
    const total = parseFloat(schedTotalUnits)
    const years = parseFloat(schedYears)
    if (!total || !years || !schedFirstVest) return []
    return eqGenSchedule(total, schedFreq, years, schedFirstVest)
  })()

  const schedSummary =
    generatedTranches.length > 0
      ? intl.formatMessage({ id: 'equity.scheduleSummary', defaultMessage: '{count} tranches of {first}–{last} units • {start} → {end}' }, { count: generatedTranches.length.toLocaleString(getNumberLocale()), first: generatedTranches[0]!.units.toLocaleString(getNumberLocale()), last: generatedTranches[generatedTranches.length - 1]!.units.toLocaleString(getNumberLocale()), start: fDate(generatedTranches[0]!.vest_date, 'short', 'always'), end: fDate(generatedTranches[generatedTranches.length - 1]!.vest_date, 'short', 'always') })
      : null

  function handleEditManually() {
    if (generatedTranches.length > 0) {
      setTranches(
        generatedTranches.map((t) => ({ ...t, _key: nextKey(), kind: 'time' as TrancheKind })),
      )
    }
    setMode('manual')
  }

  // Which tranche list to use for submission
  const effectiveTranches: TrancheInput[] =
    mode === 'schedule'
      ? generatedTranches.map((t) => ({
          vest_date: t.vest_date,
          units: t.units,
          kind: 'time' as TrancheKind,
        }))
      : tranches.map(({ vest_date, units, kind, condition_note }) => ({
          vest_date,
          units,
          kind,
          condition_note,
        }))

  const totalUnits =
    mode === 'schedule'
      ? generatedTranches.reduce((s, t) => s + t.units, 0)
      : tranches.reduce((sum, t) => sum + (t.units || 0), 0)

  // Account is valid when an existing account is selected OR a new name has been typed.
  const accountChosen =
    (accountId !== '' && accountId !== NEW_ACCOUNT_SENTINEL) ||
    (accountId === NEW_ACCOUNT_SENTINEL && newAccountName.trim().length > 0)

  const scheduleReady =
    mode === 'schedule'
      ? generatedTranches.length > 0
      : tranches.length > 0 &&
        totalUnits > 0 &&
        tranches.every((t) => t.vest_date.length === 10 && t.units > 0)

  const isValid =
    symbol.trim().length > 0 &&
    instrumentId != null &&
    grantDate.length === 10 &&
    scheduleReady &&
    accountChosen

  async function handleSave() {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError(null)

    const accountField: { account_id?: string; account_name?: string } =
      accountId === NEW_ACCOUNT_SENTINEL
        ? { account_name: newAccountName.trim() }
        : { account_id: accountId }

    const body: GrantCreate = {
      instrument_id: instrumentId!,
      total_units: totalUnits,
      grant_date: grantDate,
      type: grantTypeApiValue(grantTypeUi),
      tax_event: taxEvent,
      release_required: releaseRequired,
      tranches: effectiveTranches,
      ...accountField,
      ...(grantPricePerUnit != null ? { grant_price_per_unit: grantPricePerUnit } : {}),
    }

    try {
      const res = await authFetch('/api/equity/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(equityError(intl, detail, (detail as { detail?: string }).detail || `HTTP ${res.status}`))
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'equity.saveFailed', defaultMessage: "Failed to save grant." }))
      setSubmitting(false)
    }
  }

  const footer = (
    <Cluster gap="--space-3" justify="between">
      <Button variant="secondary" onClick={onClose} disabled={submitting}>
        {intl.formatMessage({ id: 'equity.cancel', defaultMessage: 'Cancel' })}
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={!isValid || submitting}>
        {submitting ? intl.formatMessage({ id: 'equity.saving', defaultMessage: 'Saving…' }) : intl.formatMessage({ id: 'equity.saveGrant', defaultMessage: "Save grant" })}
      </Button>
    </Cluster>
  )

  return (
    <Modal open onClose={onClose} title={intl.formatMessage({ id: 'equity.addTitle', defaultMessage: "Add equity grant" })} size="lg" footer={footer}>
      <Stack gap="--space-5">
        {/* ── Grant text paste-box ── */}
        <div className="equity-add-paste">
          <div className="lx-mark lx-mark--sm equity-add-paste__icon" aria-hidden>
            ✦
          </div>
          <p className="equity-add-paste__heading">{intl.formatMessage({ id: 'equity.pasteHeading', defaultMessage: "Paste grant letter or describe it" })}</p>
          <textarea
            className="equity-add-paste__box"
            placeholder={intl.formatMessage({ id: 'equity.pastePlaceholder', defaultMessage: "e.g. 1,000 NVDA RSUs, quarterly over 4 years from 2026-09-15" })}
            rows={3}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            aria-label={intl.formatMessage({ id: 'equity.grantText', defaultMessage: "Grant letter text" })}
          />
          <div className="equity-add-paste__foot">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFillFromText}
              disabled={!pasteText.trim()}
            >
              {intl.formatMessage({ id: 'equity.fillText', defaultMessage: "Fill from text" })}
            </Button>
            {parsedCount !== null && (
              <Text
                as="span"
                size="sm"
                tone={parsedCount === 0 ? 'faint' : undefined}
              >
                {parsedCount === 0 ? intl.formatMessage({ id: 'equity.parseFailed', defaultMessage: "Couldn't parse any fields — review and fill manually." }) : intl.formatMessage({ id: 'equity.parsedCount', defaultMessage: 'Filled in {count, plural, one {# field} other {# fields}} — review below.' }, { count: parsedCount })}
              </Text>
            )}
          </div>
        </div>

        <div className="equity-add-or" aria-hidden>
          {intl.formatMessage({ id: 'equity.manualEntry', defaultMessage: "or fill in manually" })}
        </div>

        <FormField
          label={intl.formatMessage({ id: 'equity.instrument', defaultMessage: "Instrument / ticker" })}
          htmlFor="grant-symbol"
          required
          error={symbolError ?? undefined}
        >
          <TextField
            id="grant-symbol"
            placeholder={intl.formatMessage({ id: 'equity.instrumentExample', defaultMessage: "e.g. ONWAI" })}
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value)
              setInstrumentId(null)
              setSymbolError(null)
            }}
            onBlur={(e) => resolveSymbol(e.target.value)}
          />
        </FormField>

        {/* ── Mode segmented control ── */}
        <div>
          <Text as="p" size="sm" weight={600} style={{ marginBottom: 'var(--space-2)' }}>
            {intl.formatMessage({ id: 'equity.schedule', defaultMessage: "Schedule" })}
          </Text>
          <SegmentedControl
            ariaLabel={intl.formatMessage({ id: 'equity.entryMode', defaultMessage: "Schedule entry mode" })}
            options={[
              { value: 'schedule', label: intl.formatMessage({ id: 'equity.scheduleGenerator', defaultMessage: "Schedule generator" }) },
              { value: 'manual', label: intl.formatMessage({ id: 'equity.manualTranches', defaultMessage: "Manual tranches" }) },
            ]}
            value={mode}
            onChange={(v) => setMode(v as Mode)}
          />
        </div>

        {/* ── Schedule generator ── */}
        {mode === 'schedule' && (
          <div className="equity-sched">
            <Cluster gap="--space-3" align="end" wrap>
              <FormField label={intl.formatMessage({ id: 'equity.totalUnits', defaultMessage: "Total units" })} htmlFor="sched-total">
                <NumberField
                  id="sched-total"
                  value={schedTotalUnits}
                  min={1}
                  step={1}
                  onChange={(e) => setSchedTotalUnits(e.target.value)}
                />
              </FormField>
              <FormField label={intl.formatMessage({ id: 'equity.frequency', defaultMessage: "Frequency" })} htmlFor="sched-freq">
                <Select
                  id="sched-freq"
                  value={schedFreq}
                  onChange={(e) => setSchedFreq(e.target.value as Frequency)}
                  options={[
                    { value: 'monthly', label: intl.formatMessage({ id: 'equity.monthly', defaultMessage: "Monthly" }) },
                    { value: 'quarterly', label: intl.formatMessage({ id: 'equity.quarterly', defaultMessage: "Quarterly" }) },
                    { value: 'annual', label: intl.formatMessage({ id: 'equity.annual', defaultMessage: "Annual" }) },
                  ]}
                />
              </FormField>
              <FormField label={intl.formatMessage({ id: 'equity.years', defaultMessage: "Over (years)" })} htmlFor="sched-years">
                <NumberField
                  id="sched-years"
                  value={schedYears}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(e) => setSchedYears(e.target.value)}
                />
              </FormField>
              <FormField label={intl.formatMessage({ id: 'equity.firstVest', defaultMessage: "First vest" })} htmlFor="sched-first-vest">
                <TextField
                  id="sched-first-vest"
                  type="date"
                  value={schedFirstVest}
                  onChange={(e) => setSchedFirstVest(e.target.value)}
                />
              </FormField>
            </Cluster>

            {schedSummary && (
              <div className="equity-sched__summary">
                <Text as="span" size="sm" tone="faint">
                  →{' '}
                </Text>
                <Text as="span" size="sm">
                  {schedSummary}
                </Text>
                <Button variant="ghost" size="sm" onClick={() => setSchedPreviewOpen((o) => !o)}>
                  {schedPreviewOpen ? intl.formatMessage({ id: 'equity.hidePreview', defaultMessage: "Hide preview" }) : intl.formatMessage({ id: 'equity.preview', defaultMessage: "Preview" })}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleEditManually}>
                  {intl.formatMessage({ id: 'equity.editManually', defaultMessage: "Edit manually" })}
                </Button>
              </div>
            )}

            {schedPreviewOpen && generatedTranches.length > 0 && (
              <div className="equity-sched__preview">
                {generatedTranches.map((t, i) => (
                  <div key={i} className="equity-sched__row">
                    <Text as="span" size="sm">
                      {fDate(t.vest_date, 'short', 'always')}
                    </Text>
                    <Text as="span" size="sm" tone="faint">
                      {intl.formatMessage({ id: 'equity.unitCount', defaultMessage: '{units} units' }, { units: t.units.toLocaleString(getNumberLocale()) })}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Manual tranche editor ── */}
        {mode === 'manual' && (
          <div className="equity-tranches">
            <Text as="h3" size="sm" weight={600} className="equity-tranches__heading">
              {intl.formatMessage({ id: 'equity.tranches', defaultMessage: "Tranches" })}
            </Text>
            <Stack gap="--space-3">
              {tranches.map((t) => (
                <Cluster key={t._key} gap="--space-2" align="end">
                  <FormField label={intl.formatMessage({ id: 'equity.vest.date', defaultMessage: "Vest date" })} htmlFor={`tranche-date-${t._key}`}>
                    <TextField
                      id={`tranche-date-${t._key}`}
                      type="date"
                      value={t.vest_date}
                      onChange={(e) => updateTranche(t._key, { vest_date: e.target.value })}
                    />
                  </FormField>
                  <FormField label={intl.formatMessage({ id: 'equity.units', defaultMessage: "Units" })} htmlFor={`tranche-units-${t._key}`}>
                    <NumberField
                      id={`tranche-units-${t._key}`}
                      value={t.units || ''}
                      min={1}
                      step={1}
                      onChange={(e) =>
                        updateTranche(t._key, { units: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </FormField>
                  <FormField label={intl.formatMessage({ id: 'equity.kind', defaultMessage: "Kind" })} htmlFor={`tranche-kind-${t._key}`}>
                    <Select
                      id={`tranche-kind-${t._key}`}
                      value={t.kind}
                      onChange={(e) =>
                        updateTranche(t._key, { kind: e.target.value as TrancheKind })
                      }
                      options={[
                        { value: 'time', label: intl.formatMessage({ id: 'equity.standard', defaultMessage: "Standard" }) },
                        { value: 'performance', label: intl.formatMessage({ id: 'equity.performance', defaultMessage: "Performance" }) },
                      ]}
                    />
                  </FormField>
                  {tranches.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTranche(t._key)}
                      aria-label={intl.formatMessage({ id: 'equity.removeTranche', defaultMessage: "Remove tranche" })}
                    >
                      <X size={14} aria-hidden="true" />
                    </Button>
                  )}
                </Cluster>
              ))}
            </Stack>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Plus size={14} aria-hidden="true" />}
              onClick={addTranche}
              className="equity-tranches__add"
            >
              {intl.formatMessage({ id: 'equity.addTranche', defaultMessage: "Add tranche row" })}
            </Button>
          </div>
        )}

        {/* ── Advanced disclosure ── */}
        <div className="equity-add-advanced">
          <button
            type="button"
            className="equity-add-advanced__toggle"
            onClick={() => setAdvancedOpen((o) => !o)}
            aria-expanded={advancedOpen}
          >
            <span className="equity-add-advanced__chevron" aria-hidden>
              {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            {intl.formatMessage({ id: 'equity.advanced', defaultMessage: "Advanced" })}
          </button>

          {advancedOpen && (
            <Stack gap="--space-4" className="equity-add-advanced__body">
              <FormField label={intl.formatMessage({ id: 'equity.grantDate', defaultMessage: "Grant date" })} htmlFor="grant-date" required>
                <TextField
                  id="grant-date"
                  type="date"
                  value={grantDate}
                  onChange={(e) => setGrantDate(e.target.value)}
                />
              </FormField>

              <FormField
                label={intl.formatMessage({ id: 'equity.grantPrice', defaultMessage: "Price at grant (per unit)" })}
                htmlFor="grant-price-per-unit"
                help={intl.formatMessage({ id: 'equity.grantPriceHelp', defaultMessage: "Optional — for reference and since-grant performance. Not used for tax." })}
              >
                <TextField
                  id="grant-price-per-unit"
                  type="number"
                  value={grantPricePerUnit ?? ''}
                  min={0}
                  step="any"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setGrantPricePerUnit(isNaN(v) ? null : v)
                  }}
                />
              </FormField>

              <FormField label={intl.formatMessage({ id: 'equity.grantType', defaultMessage: "Grant type" })} htmlFor="grant-type" required>
                <Select
                  id="grant-type"
                  value={grantTypeUi}
                  onChange={(e) => setGrantTypeUi(e.target.value)}
                  options={[
                    { value: 'rsu', label: 'RSU' },
                    { value: 'esow', label: 'ESOW' },
                    { value: 'ltip', label: intl.formatMessage({ id: 'equity.ltip', defaultMessage: "LTIP (performance)" }) },
                  ]}
                />
              </FormField>

              <FormField label={intl.formatMessage({ id: 'equity.taxEvent', defaultMessage: "Tax event" })} htmlFor="grant-tax-event" required>
                <Select
                  id="grant-tax-event"
                  value={taxEvent}
                  onChange={(e) => setTaxEvent(e.target.value as TaxEvent)}
                  options={[
                    { value: 'at_vest', label: intl.formatMessage({ id: 'equity.taxAtVest', defaultMessage: "Tax at vest — Singapore / US / Germany" }) },
                    { value: 'deferred', label: intl.formatMessage({ id: 'equity.taxDeferred', defaultMessage: "Tax deferred — Vietnam and others" }) },
                  ]}
                />
              </FormField>

              <FormField
                label={intl.formatMessage({ id: 'equity.shareDelivery', defaultMessage: "Share delivery" })}
                htmlFor="grant-release-required"
                help={intl.formatMessage({ id: 'equity.deliveryHelp', defaultMessage: "Choose delayed when your plan hands the shares over some time AFTER the vest date — a broker settlement lag, a blackout window, or country delivery rules. Vested units then count in your net worth but stay unsellable until you mark them released." })}
              >
                <Select
                  id="grant-release-required"
                  value={releaseRequired ? 'delayed' : 'at_vest'}
                  onChange={(e) => setReleaseRequired(e.target.value === 'delayed')}
                  options={[
                    { value: 'at_vest', label: intl.formatMessage({ id: 'equity.sellableAtVest', defaultMessage: "Sellable at vest — the usual case" }) },
                    { value: 'delayed', label: intl.formatMessage({ id: 'equity.deliveredLater', defaultMessage: "Delivered later — released after vest" }) },
                  ]}
                />
              </FormField>
            </Stack>
          )}
        </div>

        <FormField
          label={intl.formatMessage({ id: 'equity.account', defaultMessage: "Account" })}
          htmlFor="grant-account"
          required
          help={intl.formatMessage({ id: 'equity.accountHelp', defaultMessage: "Custodian or brokerage account where unvested units and vest transactions are tracked." })}
        >
          <Select
            id="grant-account"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value)
              if (e.target.value !== NEW_ACCOUNT_SENTINEL) setNewAccountName('')
            }}
            options={[
              { value: '', label: intl.formatMessage({ id: 'equity.selectAccount', defaultMessage: "Select an account…" }) },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
              { value: NEW_ACCOUNT_SENTINEL, label: intl.formatMessage({ id: 'equity.newAccount', defaultMessage: "+ New account…" }) },
            ]}
          />
          {accountId === NEW_ACCOUNT_SENTINEL && (
            <TextField
              id="grant-new-account-name"
              placeholder={intl.formatMessage({ id: 'equity.accountName', defaultMessage: "Account name (e.g. JP Morgan)" })}
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              style={{ marginTop: 'var(--space-2)' }}
            />
          )}
        </FormField>

        {error && <ErrorState message={error} />}
      </Stack>
    </Modal>
  )
}
