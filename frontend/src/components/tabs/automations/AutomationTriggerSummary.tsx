import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { conditionIsComplete, readConditions, transactionLabel } from './txnConditions'
import { CONFLICTING_CONDITIONS, conditionConflicts } from './txnConditionConflicts'
import { Clock3, Zap } from 'lucide-react'
import type { AutomationTrigger } from '../../../api/automations'
import { fDateTime } from '../../../utils/format'
import {
  moneyLabel,
  transactionTriggerView,
  triggerAmountCurrency,
} from './automationTriggerPredicates'

export interface AutomationOption {
  id: string
  label: string
}

export interface AutomationOptions {
  accounts: AutomationOption[]
  instruments: AutomationOption[]
  payees?: AutomationOption[]
  base_currency?: string
}

const WEEKDAYS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

function optionLabel(options: AutomationOption[], id: unknown, fallback: string) {
  if (typeof id !== 'string' || !id) return fallback
  return options.find((option) => option.id === id)?.label ?? id
}

function timeLabel(value?: string) {
  if (!value) return '—'
  const [rawHour = '0', rawMinute = '0'] = value.split(':')
  const hour = Number(rawHour)
  const minute = Number(rawMinute)
  const period = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`
}

function ordinal(value: number) {
  const mod100 = value % 100
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th')
  return `${value}${suffix}`
}

export function automationTriggerLabel(
  trigger: AutomationTrigger,
  options: AutomationOptions = EMPTY_AUTOMATION_OPTIONS,
  intl?: IntlShape,
): string {
  if (intl && !intl.locale.startsWith('en')) return localizedTriggerLabel(trigger, options, intl)
  if (trigger.kind === 'manual') return 'Only when you ask'
  if (trigger.kind === 'schedule') {
    if (trigger.type === 'daily') return `Every day at ${timeLabel(trigger.time)}`
    if (trigger.type === 'weekdays') return `Weekdays at ${timeLabel(trigger.time)}`
    if (trigger.type === 'weekly')
      return `Every ${WEEKDAYS[String(trigger.day)] ?? trigger.day ?? '—'} at ${timeLabel(trigger.time)}`
    if (trigger.type === 'monthly')
      return `Monthly on the ${ordinal(Number(trigger.day) || 1)} at ${timeLabel(trigger.time)}`
    if (trigger.type === 'interval') {
      return intervalLabel(Number(trigger.seconds || 0))
    }
    if (trigger.type === 'once')
      return trigger.at ? `Once on ${fDateTime(trigger.at, 'short', 'always')}` : 'Once'
    return trigger.rrule ? `Custom cadence • ${trigger.rrule}` : 'Custom cadence'
  }

  const when = trigger.when
  let label: string
  if (trigger.event === 'txn') {
    const view = transactionTriggerView(when)
    if (view.custom) {
      label = `Custom transaction${view.exactConditions ? ` • ${view.exactConditions}` : ''}`
    } else {
      label = transactionLabel(readConditions(when), options)
    }
  } else if (trigger.event === 'balance') {
    label = `When ${optionLabel(options.accounts, when.account, 'an account')} ${when.direction === 'above' ? 'rises above' : 'drops below'} ${when.amount ? moneyLabel(triggerAmountCurrency('balance', when, options), when.amount) : '—'}`
  } else {
    const symbol = optionLabel(options.instruments, when.symbol, 'a ticker')
    const pct = `${when.value || '—'}% in a day`
    if (when.direction === 'move') label = `When ${symbol} moves more than ${pct}`
    else if (when.direction === 'rise') label = `When ${symbol} rises more than ${pct}`
    else if (when.direction === 'fall') label = `When ${symbol} falls more than ${pct}`
    else if (!when.direction) label = `When ${symbol}’s price moves`
    else
      label = `When ${symbol} ${when.direction === 'above' ? 'rises above' : 'falls below'} ${when.value ? moneyLabel(triggerAmountCurrency('price', when, options), when.value) : '—'}`
  }
  if (trigger.limit === 'hour') return `${label} • at most once an hour`
  if (trigger.limit === 'day') return `${label} • at most once a day`
  return label
}

function localizedTriggerLabel(
  trigger: AutomationTrigger,
  options: AutomationOptions,
  intl: IntlShape,
): string {
  if (trigger.kind === 'manual')
    return intl.formatMessage({
      id: 'automations.trigger.manual',
      defaultMessage: 'Only when you ask',
    })
  if (trigger.kind === 'schedule') {
    const timeParts = trigger.time?.match(/^(\d{1,2}):(\d{2})$/)
    const time = timeParts
      ? new Intl.DateTimeFormat(intl.locale, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(2000, 0, 1, Number(timeParts[1]), Number(timeParts[2]))))
      : timeLabel(trigger.time)
    if (trigger.type === 'daily')
      return intl.formatMessage(
        { id: 'automations.trigger.daily', defaultMessage: 'Every day at {time}' },
        { time },
      )
    if (trigger.type === 'weekdays')
      return intl.formatMessage(
        { id: 'automations.trigger.weekdays', defaultMessage: 'Weekdays at {time}' },
        { time },
      )
    if (trigger.type === 'weekly') {
      const days = [
        intl.formatMessage({ id: 'automations.day.mon', defaultMessage: 'Monday' }),
        intl.formatMessage({ id: 'automations.day.tue', defaultMessage: 'Tuesday' }),
        intl.formatMessage({ id: 'automations.day.wed', defaultMessage: 'Wednesday' }),
        intl.formatMessage({ id: 'automations.day.thu', defaultMessage: 'Thursday' }),
        intl.formatMessage({ id: 'automations.day.fri', defaultMessage: 'Friday' }),
        intl.formatMessage({ id: 'automations.day.sat', defaultMessage: 'Saturday' }),
        intl.formatMessage({ id: 'automations.day.sun', defaultMessage: 'Sunday' }),
      ]
      const index = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(String(trigger.day))
      return intl.formatMessage(
        { id: 'automations.trigger.weekly', defaultMessage: 'Every {day} at {time}' },
        { day: days[index] ?? String(trigger.day ?? '—'), time },
      )
    }
    if (trigger.type === 'monthly')
      return intl.formatMessage(
        { id: 'automations.trigger.monthly', defaultMessage: 'Monthly on day {day} at {time}' },
        { day: Number(trigger.day) || 1, time },
      )
    if (trigger.type === 'interval') {
      const seconds = Number(trigger.seconds || 0)
      if (!seconds)
        return intl.formatMessage({
          id: 'automations.trigger.intervalEmpty',
          defaultMessage: 'Every —',
        })
      if (seconds % 3600 === 0)
        return intl.formatMessage(
          {
            id: 'automations.trigger.hours',
            defaultMessage: 'Every {count, plural, one {hour} other {# hours}}',
          },
          { count: seconds / 3600 },
        )
      if (seconds % 60 === 0)
        return intl.formatMessage(
          {
            id: 'automations.trigger.minutes',
            defaultMessage: 'Every {count, plural, one {minute} other {# minutes}}',
          },
          { count: seconds / 60 },
        )
      return intl.formatMessage(
        {
          id: 'automations.trigger.seconds',
          defaultMessage: 'Every {count, plural, one {second} other {# seconds}}',
        },
        { count: seconds },
      )
    }
    if (trigger.type === 'once')
      return trigger.at
        ? intl.formatMessage(
            { id: 'automations.trigger.onceOn', defaultMessage: 'Once on {date}' },
            { date: fDateTime(trigger.at, 'short', 'always') },
          )
        : intl.formatMessage({ id: 'automations.trigger.once', defaultMessage: 'Once' })
    return trigger.rrule
      ? intl.formatMessage(
          { id: 'automations.trigger.customRule', defaultMessage: 'Custom cadence • {rule}' },
          { rule: trigger.rrule },
        )
      : intl.formatMessage({ id: 'automations.trigger.custom', defaultMessage: 'Custom cadence' })
  }
  const when = trigger.when
  let label: string
  if (trigger.event === 'txn') {
    const view = transactionTriggerView(when)
    label = view.custom
      ? intl.formatMessage(
          { id: 'automations.trigger.customTxn', defaultMessage: 'Custom transaction{details}' },
          { details: view.exactConditions ? ` • ${view.exactConditions}` : '' },
        )
      : transactionLabel(readConditions(when), options, intl)
  } else if (trigger.event === 'balance') {
    const account = optionLabel(
      options.accounts,
      when.account,
      intl.formatMessage({ id: 'automations.trigger.account', defaultMessage: 'an account' }),
    )
    const direction =
      when.direction === 'above'
        ? intl.formatMessage({
            id: 'automations.trigger.risesAbove',
            defaultMessage: 'rises above',
          })
        : intl.formatMessage({
            id: 'automations.trigger.dropsBelow',
            defaultMessage: 'drops below',
          })
    const amount = when.amount
      ? moneyLabel(triggerAmountCurrency('balance', when, options), when.amount)
      : '—'
    label = intl.formatMessage(
      { id: 'automations.trigger.balance', defaultMessage: 'When {account} {direction} {amount}' },
      { account, direction, amount },
    )
  } else {
    const symbol = optionLabel(
      options.instruments,
      when.symbol,
      intl.formatMessage({ id: 'automations.trigger.ticker', defaultMessage: 'a ticker' }),
    )
    if (when.direction === 'move' || when.direction === 'rise' || when.direction === 'fall') {
      const direction =
        when.direction === 'move'
          ? intl.formatMessage({
              id: 'automations.trigger.movesMore',
              defaultMessage: 'moves more than',
            })
          : when.direction === 'rise'
            ? intl.formatMessage({
                id: 'automations.trigger.risesMore',
                defaultMessage: 'rises more than',
              })
            : intl.formatMessage({
                id: 'automations.trigger.fallsMore',
                defaultMessage: 'falls more than',
              })
      label = intl.formatMessage(
        {
          id: 'automations.trigger.pricePercent',
          defaultMessage: 'When {symbol} {direction} {percent}% in a day',
        },
        { symbol, direction, percent: String(when.value || '—') },
      )
    } else if (!when.direction)
      label = intl.formatMessage(
        { id: 'automations.trigger.priceMoves', defaultMessage: 'When {symbol}’s price moves' },
        { symbol },
      )
    else
      label = intl.formatMessage(
        {
          id: 'automations.trigger.priceThreshold',
          defaultMessage: 'When {symbol} {direction} {amount}',
        },
        {
          symbol,
          direction:
            when.direction === 'above'
              ? intl.formatMessage({
                  id: 'automations.trigger.risesAbove',
                  defaultMessage: 'rises above',
                })
              : intl.formatMessage({
                  id: 'automations.trigger.fallsBelow',
                  defaultMessage: 'falls below',
                }),
          amount: when.value
            ? moneyLabel(triggerAmountCurrency('price', when, options), when.value)
            : '—',
        },
      )
  }
  if (trigger.limit === 'hour')
    return intl.formatMessage(
      { id: 'automations.trigger.limitHour', defaultMessage: '{label} • at most once an hour' },
      { label },
    )
  if (trigger.limit === 'day')
    return intl.formatMessage(
      { id: 'automations.trigger.limitDay', defaultMessage: '{label} • at most once a day' },
      { label },
    )
  return label
}

export function missingTriggerFields(trigger: AutomationTrigger): string[] {
  if (trigger.kind === 'manual') return []
  if (trigger.kind === 'schedule') {
    if (trigger.type === 'once') return trigger.at ? [] : ['date and time']
    if (trigger.type === 'interval') return trigger.seconds ? [] : ['interval']
    if (trigger.type === 'rrule') return trigger.rrule ? [] : ['custom cadence']
    const missing: string[] = []
    if (!trigger.time) missing.push('time')
    if (trigger.type === 'weekly' && !trigger.day) missing.push('weekday')
    if (trigger.type === 'monthly' && !trigger.day) missing.push('day')
    return missing
  }
  if (trigger.event === 'balance') {
    return [
      !trigger.when.account && 'account',
      !trigger.when.direction && 'direction',
      !trigger.when.amount && 'amount',
    ].filter(Boolean) as string[]
  }
  if (trigger.event === 'txn') {
    const conditions = readConditions(trigger.when)
    return [
      !conditions.every(conditionIsComplete) && 'condition',
      conditionConflicts(conditions).length > 0 && CONFLICTING_CONDITIONS,
    ].filter(Boolean) as string[]
  }
  if (trigger.event === 'price') {
    return [
      !trigger.when.symbol && 'ticker',
      !trigger.when.direction && 'direction',
      !trigger.when.value && 'threshold',
    ].filter(Boolean) as string[]
  }
  return []
}

export const EMPTY_AUTOMATION_OPTIONS: AutomationOptions = {
  accounts: [],
  instruments: [],
  payees: [],
}

/** The trigger read back as a sentence, above its fields — and what still blocks saving. */
export function AutomationTriggerSummary({
  trigger,
  options = EMPTY_AUTOMATION_OPTIONS,
}: {
  trigger: AutomationTrigger
  options?: AutomationOptions
}) {
  const intl = useAppIntl()
  const missing = missingTriggerFields(trigger)
  const toSet = missing.filter((field) => field !== CONFLICTING_CONDITIONS)
  const fieldLabels: Record<string, string> = {
    'date and time': intl.formatMessage({
      id: 'automations.field.dateTime',
      defaultMessage: 'date and time',
    }),
    interval: intl.formatMessage({ id: 'automations.field.interval', defaultMessage: 'interval' }),
    'custom cadence': intl.formatMessage({
      id: 'automations.field.customCadence',
      defaultMessage: 'custom cadence',
    }),
    time: intl.formatMessage({ id: 'automations.field.time', defaultMessage: 'time' }),
    weekday: intl.formatMessage({ id: 'automations.field.weekday', defaultMessage: 'weekday' }),
    day: intl.formatMessage({ id: 'automations.field.day', defaultMessage: 'day' }),
    account: intl.formatMessage({ id: 'automations.field.account', defaultMessage: 'account' }),
    direction: intl.formatMessage({
      id: 'automations.field.direction',
      defaultMessage: 'direction',
    }),
    amount: intl.formatMessage({ id: 'automations.field.amount', defaultMessage: 'amount' }),
    condition: intl.formatMessage({
      id: 'automations.field.condition',
      defaultMessage: 'condition',
    }),
    ticker: intl.formatMessage({ id: 'automations.field.ticker', defaultMessage: 'ticker' }),
    threshold: intl.formatMessage({
      id: 'automations.field.threshold',
      defaultMessage: 'threshold',
    }),
  }
  const conflicting = missing.length > toSet.length
  const Icon = trigger.kind === 'event' ? Zap : Clock3
  return (
    <div
      className={`a3-trigger-summary${missing.length ? ' issue' : ''}`}
      data-od-id="trigger-summary"
    >
      <span className="a3-trigger-summary-ic">
        <Icon size={14} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span className="grow">
        <span className="a3-trigger-summary-text">
          {automationTriggerLabel(trigger, options, intl)}
        </span>
        {toSet.length > 0 && (
          <span className="a3-trigger-missing">
            {intl.formatMessage(
              { id: 'automations.trigger.missing', defaultMessage: 'Set the {fields} below.' },
              {
                fields: intl.locale.startsWith('en')
                  ? joinFields(toSet)
                  : new Intl.ListFormat(intl.locale, { type: 'conjunction' }).format(
                      toSet.map((field) => fieldLabels[field] ?? field),
                    ),
              },
            )}
          </span>
        )}
        {conflicting && (
          <span className="a3-trigger-missing a3-trigger-error">
            {intl.formatMessage({
              id: 'automations.trigger.conflict',
              defaultMessage:
                'These conditions can never all be true, so it would never run — fix them below.',
            })}
          </span>
        )}
      </span>
    </div>
  )
}

function joinFields(fields: string[]) {
  if (fields.length < 2) return fields[0] ?? ''
  if (fields.length === 2) return `${fields[0]} and ${fields[1]}`
  return `${fields.slice(0, -1).join(', ')} and ${fields.at(-1)}`
}

function intervalLabel(seconds: number) {
  if (!seconds) return 'Every —'
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600
    return `Every ${hours === 1 ? 'hour' : `${hours} hours`}`
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60
    return `Every ${minutes === 1 ? 'minute' : `${minutes} minutes`}`
  }
  return `Every ${seconds === 1 ? 'second' : `${seconds} seconds`}`
}
