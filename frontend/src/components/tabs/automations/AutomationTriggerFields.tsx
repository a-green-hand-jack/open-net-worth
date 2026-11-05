import { useAppIntl } from '../../../i18n/useAppIntl'
import { useState } from 'react'
import { Clock3, Sparkles, Zap } from 'lucide-react'
import type { AutomationEventType, AutomationTrigger, ScheduleType } from '../../../api/automations'
import type { AutomationOptions } from './AutomationTriggerSummary'
import { EMPTY_AUTOMATION_OPTIONS, missingTriggerFields } from './AutomationTriggerSummary'
import {
  instrumentCurrency,
  transactionTriggerView,
  triggerAmountCurrency,
} from './automationTriggerPredicates'
import { Input, OptionSelect, Row, Select } from './automationFormControls'
import { TransactionConditionFields } from './AutomationConditionFields'
import { TickerConfirm, TickerPicker, type PickedInstrument } from './TickerPicker'

const HOURLY_SECONDS = 3600
export function AutomationTriggerFields({
  trigger,
  onChange,
  options = EMPTY_AUTOMATION_OPTIONS,
  optionsError,
  onRetryOptions,
  onAskForCadence,
}: {
  trigger: AutomationTrigger
  onChange: (trigger: AutomationTrigger, touchedPath: string) => void
  options?: AutomationOptions
  optionsError?: string | null
  onRetryOptions?: () => void
  /** Hand the cadence to Lucius — the caller supplies the draft's context. */
  onAskForCadence?: () => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const schedules = [
    ['manual', formatMessage({ id: 'automations.form.manual', defaultMessage: 'Manual' })],
    ['interval', formatMessage({ id: 'automations.form.hourly', defaultMessage: 'Hourly' })],
    ['daily', formatMessage({ id: 'automations.form.daily', defaultMessage: 'Daily' })],
    ['weekdays', formatMessage({ id: 'automations.form.weekdays', defaultMessage: 'Weekdays' })],
    ['weekly', formatMessage({ id: 'automations.form.weekly', defaultMessage: 'Weekly' })],
    ['monthly', formatMessage({ id: 'automations.form.monthly', defaultMessage: 'Monthly' })],
    ['once', formatMessage({ id: 'automations.form.once', defaultMessage: 'Once, on a date' })],
    ['custom', formatMessage({ id: 'automations.form.custom', defaultMessage: 'Custom' })],
  ] as const
  const days = [
    ['mon', formatMessage({ id: 'automations.day.mon', defaultMessage: 'Monday' })],
    ['tue', formatMessage({ id: 'automations.day.tue', defaultMessage: 'Tuesday' })],
    ['wed', formatMessage({ id: 'automations.day.wed', defaultMessage: 'Wednesday' })],
    ['thu', formatMessage({ id: 'automations.day.thu', defaultMessage: 'Thursday' })],
    ['fri', formatMessage({ id: 'automations.day.fri', defaultMessage: 'Friday' })],
    ['sat', formatMessage({ id: 'automations.day.sat', defaultMessage: 'Saturday' })],
    ['sun', formatMessage({ id: 'automations.day.sun', defaultMessage: 'Sunday' })],
  ] as const
  const events = [
    [
      'txn',
      formatMessage({ id: 'automations.form.txnEvent', defaultMessage: 'A transaction posts' }),
    ],
    [
      'balance',
      formatMessage({
        id: 'automations.form.balanceEvent',
        defaultMessage: 'A balance crosses a threshold',
      }),
    ],
    [
      'price',
      formatMessage({ id: 'automations.form.priceEvent', defaultMessage: 'A price moves' }),
    ],
  ] as const
  const directions = [
    [
      '',
      formatMessage({
        id: 'automations.form.chooseDirection',
        defaultMessage: 'Choose a direction',
      }),
    ],
    ['below', formatMessage({ id: 'automations.form.dropsBelow', defaultMessage: 'Drops below' })],
    ['above', formatMessage({ id: 'automations.form.risesAbove', defaultMessage: 'Rises above' })],
  ] as const
  const priceDirections = [
    [
      '',
      formatMessage({
        id: 'automations.form.chooseDirection',
        defaultMessage: 'Choose a direction',
      }),
    ],
    [
      'below',
      formatMessage({ id: 'automations.form.fallsPrice', defaultMessage: 'Falls below a price' }),
    ],
    [
      'above',
      formatMessage({ id: 'automations.form.risesPrice', defaultMessage: 'Rises above a price' }),
    ],
    [
      'fall',
      formatMessage({ id: 'automations.form.fallsPercent', defaultMessage: 'Falls more than %' }),
    ],
    [
      'rise',
      formatMessage({ id: 'automations.form.risesPercent', defaultMessage: 'Rises more than %' }),
    ],
    [
      'move',
      formatMessage({
        id: 'automations.form.movesPercent',
        defaultMessage: 'Moves more than % (either way)',
      }),
    ],
  ] as const
  const runHints = {
    each: formatMessage({
      id: 'automations.form.eachHint',
      defaultMessage: 'A run for every match, one after another.',
    }),
    hour: formatMessage({
      id: 'automations.form.hourHint',
      defaultMessage:
        'Runs on the first match; anything later in the hour waits and comes in one run.',
    }),
    day: formatMessage({
      id: 'automations.form.dayHint',
      defaultMessage:
        'Runs on the first match; anything later in the day waits and comes in one run.',
    }),
  }
  const missing = new Set(missingTriggerFields(trigger))
  // A ticker resolved from the market search this session — not in `options` until they reload.
  const [picked, setPicked] = useState<PickedInstrument[]>([])
  const [choosingTicker, setChoosingTicker] = useState(false)
  const instruments = [...options.instruments, ...picked]
  // Lucius may store an instrument id; the box shows (and the quote looks up) its ticker.
  const rawSymbol = trigger.kind === 'event' ? String(trigger.when.symbol ?? '') : ''
  const tickerText = instruments.find((i) => i.id === rawSymbol)?.label ?? rawSymbol
  const eventMode = trigger.kind === 'event'
  const pickedSchedule = schedulePickerValue(trigger)
  const amountCurrency =
    trigger.kind === 'event' ? triggerAmountCurrency(trigger.event, trigger.when, options) : ''
  const transactionView =
    trigger.kind === 'event' && trigger.event === 'txn'
      ? transactionTriggerView(trigger.when)
      : null
  const setKind = (kind: 'schedule' | 'event') => {
    if (trigger.kind === kind) return
    onChange(
      kind === 'event'
        ? { kind: 'event', event: 'txn', when: {}, limit: 'hour' }
        : { kind: 'schedule', type: 'weekdays', time: '08:00' },
      'trigger.kind',
    )
  }
  const setScheduleType = (value: string) => {
    if (value === 'manual') return onChange({ kind: 'manual' }, 'trigger.kind')
    if (value === 'custom') {
      onAskForCadence?.()
      return
    }
    const type = value as ScheduleType
    const next: Extract<AutomationTrigger, { kind: 'schedule' }> = { kind: 'schedule', type }
    if (type === 'daily' || type === 'weekdays') next.time = '08:00'
    if (type === 'weekly') Object.assign(next, { day: 'mon', time: '08:00' })
    if (type === 'monthly') Object.assign(next, { day: 1, time: '08:00' })
    if (type === 'interval') next.seconds = HOURLY_SECONDS
    onChange(next, trigger.kind === 'schedule' ? 'trigger.type' : 'trigger.kind')
  }
  const setSchedule = (
    patch: Partial<Extract<AutomationTrigger, { kind: 'schedule' }>>,
    path: string,
  ) => trigger.kind === 'schedule' && onChange({ ...trigger, ...patch }, path)
  const setWhen = (patch: Record<string, unknown>, path: string) =>
    trigger.kind === 'event' && onChange({ ...trigger, when: { ...trigger.when, ...patch } }, path)
  const setEventType = (event: AutomationEventType) =>
    onChange(
      {
        kind: 'event',
        event,
        when: {},
        limit: event === 'txn' ? 'hour' : event === 'balance' || event === 'price' ? 'day' : 'each',
      },
      'trigger.event',
    )

  return (
    <div className="a3-trigger-details" id="a3-trigger-details" data-od-id="trigger-details">
      <div
        className="a3-seg"
        role="radiogroup"
        aria-label={formatMessage({
          id: 'automations.form.triggerType',
          defaultMessage: 'Trigger type',
        })}
        data-od-id="trigger-row"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!eventMode}
          className={`a3-seg-btn${!eventMode ? ' on' : ''}`}
          onClick={() => setKind('schedule')}
        >
          <Clock3 size={13} aria-hidden="true" />{' '}
          {formatMessage({ id: 'automations.form.schedule', defaultMessage: 'Schedule' })}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={eventMode}
          className={`a3-seg-btn${eventMode ? ' on' : ''}`}
          onClick={() => setKind('event')}
        >
          <Zap size={13} aria-hidden="true" />{' '}
          {formatMessage({ id: 'automations.form.event', defaultMessage: 'Event' })}
        </button>
      </div>
      {optionsError && (
        <div className="a3-option-error" role="alert">
          <span>{optionsError}</span>
          {onRetryOptions && (
            <button type="button" className="a3-linkbtn" onClick={onRetryOptions}>
              {formatMessage({ id: 'automations.form.retry', defaultMessage: 'Retry' })}
            </button>
          )}
        </div>
      )}
      {eventMode && trigger.kind === 'event' ? (
        <div className="a3-trows">
          <Row
            label={formatMessage({ id: 'automations.form.event', defaultMessage: 'Event' })}
            htmlFor="automation-event"
            required
          >
            <Select
              id="automation-event"
              value={transactionView?.custom ? 'custom' : trigger.event}
              options={
                transactionView?.custom
                  ? [
                      ...events,
                      [
                        'custom',
                        formatMessage({ id: 'automations.form.custom', defaultMessage: 'Custom' }),
                      ],
                    ]
                  : events
              }
              onChange={(value) => {
                if (value !== 'custom') setEventType(value as AutomationEventType)
              }}
            />
          </Row>
          {transactionView?.custom && (
            <Row
              label={formatMessage({
                id: 'automations.form.conditions',
                defaultMessage: 'Conditions',
              })}
              htmlFor="automation-custom-conditions"
            >
              <output id="automation-custom-conditions" className="a3-muted">
                {transactionView.exactConditions}
              </output>
            </Row>
          )}
          {trigger.event === 'txn' && !transactionView?.custom && (
            <TransactionConditionFields
              when={trigger.when}
              accounts={options.accounts}
              payees={options.payees ?? []}
              baseCurrency={options.base_currency}
              onChange={setWhen}
            />
          )}
          {trigger.event === 'balance' && (
            <>
              <Row
                label={formatMessage({ id: 'automations.form.account', defaultMessage: 'Account' })}
                htmlFor="automation-account"
                required
              >
                <OptionSelect
                  needed={missing.has('account')}
                  id="automation-account"
                  value={trigger.when.account}
                  options={options.accounts}
                  placeholder={formatMessage({
                    id: 'automations.form.chooseAccount',
                    defaultMessage: 'Choose an account',
                  })}
                  onChange={(value) => setWhen({ account: value }, 'trigger.when.account')}
                />
              </Row>
              <Row
                label={formatMessage({
                  id: 'automations.form.direction',
                  defaultMessage: 'Direction',
                })}
                htmlFor="automation-direction"
                required
              >
                <Select
                  needed={missing.has('direction')}
                  id="automation-direction"
                  value={String(trigger.when.direction ?? '')}
                  placeholder={formatMessage({
                    id: 'automations.form.chooseDirection',
                    defaultMessage: 'Choose a direction',
                  })}
                  options={directions}
                  onChange={(value) => setWhen({ direction: value }, 'trigger.when.direction')}
                />
              </Row>
              <Row
                label={formatMessage({ id: 'automations.form.amount', defaultMessage: 'Amount' })}
                htmlFor="automation-amount"
                required
                unit={amountCurrency}
              >
                <Input
                  needed={missing.has('amount')}
                  id="automation-amount"
                  type="number"
                  value={trigger.when.amount}
                  onChange={(value) => setWhen({ amount: value }, 'trigger.when.amount')}
                />
              </Row>
            </>
          )}
          {trigger.event === 'price' && (
            <>
              <Row
                label={formatMessage({ id: 'automations.form.ticker', defaultMessage: 'Ticker' })}
                htmlFor="automation-symbol"
                required
                below={
                  <TickerConfirm
                    ticker={choosingTicker ? '' : tickerText}
                    onCurrency={(ticker, currency) => {
                      if (!instrumentCurrency(instruments, ticker))
                        setPicked((list) => [...list, { id: ticker, label: ticker, currency }])
                    }}
                    onSearchAgain={() => {
                      setWhen({ symbol: '' }, 'trigger.when.symbol')
                      document.getElementById('automation-symbol')?.focus()
                    }}
                  />
                }
              >
                <TickerPicker
                  needed={missing.has('holding')}
                  id="automation-symbol"
                  value={tickerText}
                  onOpenChange={setChoosingTicker}
                  instruments={instruments}
                  onChange={(ticker, instrument) => {
                    if (instrument) {
                      setPicked((list) => [...list, instrument])
                      // A market pick just created the instrument: reload the choices so the
                      // summary above names its currency too.
                      onRetryOptions?.()
                    }
                    setWhen({ symbol: ticker }, 'trigger.when.symbol')
                  }}
                />
              </Row>
              <Row
                label={formatMessage({
                  id: 'automations.form.direction',
                  defaultMessage: 'Direction',
                })}
                htmlFor="automation-price-direction"
                required
              >
                <Select
                  needed={missing.has('direction')}
                  id="automation-price-direction"
                  value={String(trigger.when.direction ?? '')}
                  placeholder={formatMessage({
                    id: 'automations.form.chooseDirection',
                    defaultMessage: 'Choose a direction',
                  })}
                  options={priceDirections}
                  onChange={(value) => setWhen({ direction: value }, 'trigger.when.direction')}
                />
              </Row>
              <Row
                label={formatMessage({
                  id: 'automations.form.threshold',
                  defaultMessage: 'Threshold',
                })}
                htmlFor="automation-value"
                required
                unit={
                  PERCENT_PRICE_DIRECTIONS.has(String(trigger.when.direction ?? ''))
                    ? formatMessage({
                        id: 'automations.form.priorClose',
                        defaultMessage: '% vs. prior close',
                      })
                    : triggerAmountCurrency('price', trigger.when, { ...options, instruments }) ||
                      undefined
                }
              >
                <Input
                  needed={missing.has('threshold')}
                  id="automation-value"
                  type="number"
                  min={0}
                  placeholder={
                    PERCENT_PRICE_DIRECTIONS.has(String(trigger.when.direction ?? ''))
                      ? formatMessage({ id: 'automations.form.example5', defaultMessage: 'e.g. 5' })
                      : formatMessage({ id: 'automations.form.price', defaultMessage: 'Price' })
                  }
                  value={trigger.when.value}
                  onChange={(value) => setWhen({ value }, 'trigger.when.value')}
                />
              </Row>
            </>
          )}
          <Row
            label={formatMessage({ id: 'automations.form.run', defaultMessage: 'Run' })}
            htmlFor="automation-limit"
            below={<span className="a3-muted">{runHints[trigger.limit]}</span>}
          >
            <Select
              id="automation-limit"
              value={trigger.limit}
              options={[
                [
                  'each',
                  formatMessage({ id: 'automations.form.each', defaultMessage: 'each time' }),
                ],
                [
                  'hour',
                  formatMessage({
                    id: 'automations.form.onceHour',
                    defaultMessage: 'at most once an hour',
                  }),
                ],
                [
                  'day',
                  formatMessage({
                    id: 'automations.form.onceDay',
                    defaultMessage: 'at most once a day',
                  }),
                ],
              ]}
              onChange={(value) =>
                onChange({ ...trigger, limit: value as 'each' | 'hour' | 'day' }, 'trigger.limit')
              }
            />
          </Row>
        </div>
      ) : (
        <div className="a3-trows">
          <Row
            label={formatMessage({ id: 'automations.form.repeats', defaultMessage: 'Repeats' })}
            htmlFor="automation-schedule-type"
            required
            below={
              onAskForCadence ? (
                <button
                  type="button"
                  className="a3-linkbtn a3-lucius-link"
                  onClick={onAskForCadence}
                >
                  <Sparkles size={12} aria-hidden="true" />
                  {formatMessage({
                    id: 'automations.form.askCadence',
                    defaultMessage: 'Create via Lucius for a custom cadence',
                  })}
                </button>
              ) : undefined
            }
          >
            <Select
              id="automation-schedule-type"
              value={pickedSchedule}
              options={schedules}
              onChange={setScheduleType}
            />
          </Row>
          {trigger.kind === 'schedule' && trigger.type === 'weekly' && (
            <Row
              label={formatMessage({ id: 'automations.form.on', defaultMessage: 'On' })}
              htmlFor="automation-weekday"
              required
            >
              <Select
                id="automation-weekday"
                value={String(trigger.day ?? 'mon')}
                options={days}
                onChange={(value) => setSchedule({ day: value }, 'trigger.day')}
              />
            </Row>
          )}
          {trigger.kind === 'schedule' && trigger.type === 'monthly' && (
            <Row
              label={formatMessage({ id: 'automations.form.onThe', defaultMessage: 'On the' })}
              htmlFor="automation-monthday"
              required
            >
              <Select
                id="automation-monthday"
                value={String(trigger.day ?? 1)}
                options={Array.from(
                  { length: 28 },
                  (_, index) =>
                    [
                      String(index + 1),
                      intl.locale.startsWith('en')
                        ? ordinal(index + 1)
                        : formatMessage(
                            { id: 'automations.form.monthDay', defaultMessage: 'Day {day}' },
                            { day: index + 1 },
                          ),
                    ] as const,
                )}
                onChange={(value) => setSchedule({ day: Number(value) }, 'trigger.day')}
              />
            </Row>
          )}
          {trigger.kind === 'schedule' &&
            ['daily', 'weekdays', 'weekly', 'monthly'].includes(trigger.type) && (
              <Row
                label={formatMessage({ id: 'automations.form.at', defaultMessage: 'At' })}
                htmlFor="automation-hour"
                required
              >
                <TimePick
                  value={trigger.time ?? '09:00'}
                  needed={missing.has('time')}
                  onChange={(value) => setSchedule({ time: value }, 'trigger.time')}
                />
              </Row>
            )}
          {trigger.kind === 'schedule' && trigger.type === 'once' && (
            <>
              <Row
                label={formatMessage({ id: 'automations.form.on', defaultMessage: 'On' })}
                htmlFor="automation-once-date"
                required
              >
                <Input
                  needed={missing.has('date and time')}
                  id="automation-once-date"
                  type="date"
                  value={(trigger.at ?? '').split('T')[0]}
                  onChange={(value) =>
                    setSchedule(
                      { at: `${value}T${(trigger.at ?? '').split('T')[1] || '09:00'}` },
                      'trigger.at',
                    )
                  }
                />
              </Row>
              <Row
                label={formatMessage({ id: 'automations.form.at', defaultMessage: 'At' })}
                htmlFor="automation-once-hour"
                required
              >
                <TimePick
                  value={(trigger.at ?? '').split('T')[1] || '09:00'}
                  needed={missing.has('date and time')}
                  idPrefix="automation-once"
                  onChange={(value) =>
                    setSchedule(
                      { at: `${(trigger.at ?? '').split('T')[0] || ''}T${value}` },
                      'trigger.at',
                    )
                  }
                />
              </Row>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const PERCENT_PRICE_DIRECTIONS = new Set(['move', 'rise', 'fall'])

function TimePick({
  value,
  onChange,
  needed = false,
  idPrefix = 'automation',
}: {
  value: string
  onChange: (value: string) => void
  needed?: boolean
  idPrefix?: string
}) {
  const { formatMessage } = useAppIntl()
  const [hour24 = '09', minute = '00'] = value.split(':')
  const numericHour = Number(hour24)
  const period = numericHour >= 12 ? 'PM' : 'AM'
  const hour = String(numericHour % 12 || 12).padStart(2, '0')
  const apply = (nextHour: string, nextMinute: string, nextPeriod: string) => {
    const baseHour = (Number(nextHour) % 12) + (nextPeriod === 'PM' ? 12 : 0)
    onChange(`${String(baseHour).padStart(2, '0')}:${nextMinute}`)
  }
  return (
    <div className="a3-timepick">
      <select
        id={`${idPrefix}-hour`}
        className={`a3-mini-select${needed ? ' needed' : ''}`}
        value={hour}
        onChange={(event) => apply(event.target.value, minute, period)}
      >
        {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map(
          (item) => (
            <option key={item}>{item}</option>
          ),
        )}
      </select>
      <span className="sep">:</span>
      <select
        aria-label={formatMessage({ id: 'automations.form.minute', defaultMessage: 'Minute' })}
        className={`a3-mini-select${needed ? ' needed' : ''}`}
        value={minute}
        onChange={(event) => apply(hour, event.target.value, period)}
      >
        {Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0')).map(
          (item) => (
            <option key={item}>{item}</option>
          ),
        )}
      </select>
      <select
        aria-label={formatMessage({ id: 'automations.form.amPm', defaultMessage: 'AM or PM' })}
        className={`a3-mini-select${needed ? ' needed' : ''}`}
        value={period}
        onChange={(event) => apply(hour, minute, event.target.value)}
      >
        <option value="AM">
          {formatMessage({ id: 'automations.form.am', defaultMessage: 'AM' })}
        </option>
        <option value="PM">
          {formatMessage({ id: 'automations.form.pm', defaultMessage: 'PM' })}
        </option>
      </select>
    </div>
  )
}

function ordinal(value: number) {
  const mod100 = value % 100
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th')
  return `${value}${suffix}`
}

function schedulePickerValue(trigger: AutomationTrigger): string {
  if (trigger.kind === 'manual') return 'manual'
  if (trigger.kind !== 'schedule') return 'manual'
  if (trigger.type === 'rrule') return 'custom'
  if (trigger.type === 'interval' && Number(trigger.seconds) !== HOURLY_SECONDS) {
    return 'custom'
  }
  return trigger.type
}
