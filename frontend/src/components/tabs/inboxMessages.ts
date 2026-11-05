import type { IntlShape } from 'react-intl'

export interface InboxMessage {
  id: string
  params?: Record<string, unknown>
}

/** Only application-declared IDs are rendered; old or unknown messages remain verbatim. */
export function inboxMessage(
  intl: IntlShape,
  message: InboxMessage | undefined,
  fallback: string,
): string {
  if (!message || typeof message.id !== 'string') return fallback
  const p = message.params ?? {}
  switch (message.id) {
    case 'inbox.server.paymentTitle':
      return intl.formatMessage({
        id: 'inbox.server.paymentTitle',
        defaultMessage: 'Payment reminder',
      })
    case 'inbox.server.partialPaymentTitle':
      return intl.formatMessage({
        id: 'inbox.server.partialPaymentTitle',
        defaultMessage: 'Partial payment reminder',
      })
    case 'inbox.server.vestTitle':
      return intl.formatMessage({ id: 'inbox.server.vestTitle', defaultMessage: 'Vest reminder' })
    case 'inbox.server.couponTitle':
      return intl.formatMessage({
        id: 'inbox.server.couponTitle',
        defaultMessage: 'Coupon reminder',
      })
    case 'inbox.server.optionTitle':
      return intl.formatMessage({ id: 'inbox.server.optionTitle', defaultMessage: 'Option expiry' })
    case 'inbox.server.captureTitle':
      return intl.formatMessage({ id: 'inbox.server.captureTitle', defaultMessage: 'Capture' })
    case 'inbox.server.captureInterrupted':
      return intl.formatMessage({
        id: 'inbox.server.captureInterrupted',
        defaultMessage:
          'A capture was interrupted before it finished — check the ledger and re-send it.',
      })
    case 'inbox.server.captureFinished':
      return intl.formatMessage({
        id: 'inbox.server.captureFinished',
        defaultMessage: 'Capture finished.',
      })
    case 'inbox.server.captureFailed':
      return typeof p.reason === 'string'
        ? intl.formatMessage(
            {
              id: 'inbox.server.captureFailed',
              defaultMessage: 'A capture failed: {reason}. Nothing may have been booked.',
            },
            { reason: p.reason },
          )
        : fallback
    case 'inbox.server.captureNotBooked':
      return typeof p.reason === 'string'
        ? intl.formatMessage(
            {
              id: 'inbox.server.captureNotBooked',
              defaultMessage: "A capture wasn't booked: {reason}.",
            },
            { reason: p.reason },
          )
        : fallback
    case 'inbox.server.optionSummary':
      return typeof p.expired === 'number' && typeof p.flagged === 'number'
        ? intl.formatMessage(
            {
              id: 'inbox.server.optionSummary',
              defaultMessage:
                '{expired} contract(s) expired ({flagged} ITM — please record assignment/exercise manually).',
            },
            { expired: p.expired, flagged: p.flagged },
          )
        : fallback
    case 'inbox.server.payment':
    case 'inbox.server.partialPayment': {
      if (
        typeof p.name !== 'string' ||
        typeof p.currency !== 'string' ||
        typeof p.amount !== 'string' ||
        typeof p.days !== 'number' ||
        !['unknown', 'overdue', 'today', 'future'].includes(String(p.due))
      )
        return fallback
      const due = intl.formatMessage(
        {
          id: 'inbox.server.paymentDue',
          defaultMessage:
            '{due, select, unknown {payment due} overdue {{days, plural, one {# day overdue} other {# days overdue}}} today {due today} future {{days, plural, one {due in # day} other {due in # days}}} other {payment due}}',
        },
        { due: String(p.due), days: p.days },
      )
      const values = { name: p.name, currency: p.currency, amount: p.amount, due }
      return message.id === 'inbox.server.payment'
        ? intl.formatMessage(
            {
              id: 'inbox.server.payment',
              defaultMessage: '{name} ({currency} {amount}) is {due}. Pay now to avoid interest.',
            },
            values,
          )
        : intl.formatMessage(
            {
              id: 'inbox.server.partialPayment',
              defaultMessage:
                '{name} — {currency} {amount} still outstanding ({due}). Pay the remainder to avoid interest.',
            },
            values,
          )
    }
    case 'inbox.server.vestSummary': {
      if (
        typeof p.date !== 'string' ||
        (p.overdue !== 'yes' && p.overdue !== 'no') ||
        !Array.isArray(p.items) ||
        !p.items.every(
          (v) =>
            v &&
            typeof v === 'object' &&
            (v.symbol === null || typeof v.symbol === 'string') &&
            typeof v.units === 'string',
        )
      )
        return fallback
      const items = p.items
        .map((v) =>
          intl.formatMessage(
            { id: 'inbox.server.vestItem', defaultMessage: '{symbol}: {units} units' },
            {
              symbol:
                v.symbol ||
                intl.formatMessage({ id: 'inbox.server.equity', defaultMessage: 'equity' }),
              units: v.units,
            },
          ),
        )
        .join(', ')
      return intl.formatMessage(
        {
          id: 'inbox.server.vestSummary',
          defaultMessage:
            'Vesting {overdue, select, yes {{date} (overdue)} other {today}}: {items} — open the Equity tab or ask Lucius to mark it vested.',
        },
        { overdue: p.overdue, date: p.date, items },
      )
    }
    case 'inbox.server.couponSummary': {
      if (
        typeof p.days !== 'number' ||
        !Array.isArray(p.items) ||
        !p.items.every(
          (v) =>
            v &&
            typeof v === 'object' &&
            (v.name === null || typeof v.name === 'string') &&
            typeof v.date === 'string' &&
            (v.amount === null || typeof v.amount === 'string'),
        )
      )
        return fallback
      const items = p.items
        .map((v) =>
          intl.formatMessage(
            {
              id: 'inbox.server.couponItem',
              defaultMessage:
                '{name}: coupon {date}{hasAmount, select, yes { ({amount} per unit)} other {}}',
            },
            {
              name:
                v.name || intl.formatMessage({ id: 'inbox.server.bond', defaultMessage: 'bond' }),
              date: v.date,
              hasAmount: v.amount === null ? 'no' : 'yes',
              amount: v.amount ?? '',
            },
          ),
        )
        .join('\n')
      return intl.formatMessage(
        {
          id: 'inbox.server.couponSummary',
          defaultMessage:
            '{count, plural, one {# payment} other {# payments}} due within {days} days:\n{items}',
        },
        { count: p.items.length, days: p.days, items },
      )
    }
    case 'inbox.server.holdingSummary': {
      if (
        !Array.isArray(p.items) ||
        !p.items.every(
          (v) =>
            v &&
            typeof v === 'object' &&
            (v.symbol === null || typeof v.symbol === 'string') &&
            typeof v.before === 'string' &&
            typeof v.after === 'string',
        )
      )
        return fallback
      const items = p.items
        .map(
          (v) =>
            `${v.symbol || intl.formatMessage({ id: 'inbox.server.aHolding', defaultMessage: 'a holding' })} ${v.before} → ${v.after}`,
        )
        .join(', ')
      return intl.formatMessage(
        {
          id: 'inbox.server.holdingSummary',
          defaultMessage:
            '{count} holding(s) had a stored quantity that disagreed with their purchase, sale and vest records, and now follow those records: {items}.',
        },
        { count: p.items.length, items },
      )
    }
    case 'inbox.server.lotSummary': {
      if (
        !Array.isArray(p.items) ||
        !p.items.every(
          (v) =>
            v &&
            typeof v === 'object' &&
            (v.symbol === null || typeof v.symbol === 'string') &&
            (v.date === null || typeof v.date === 'string') &&
            typeof v.quantity === 'string',
        )
      )
        return fallback
      const items = p.items
        .map((v) =>
          intl.formatMessage(
            { id: 'inbox.server.lotItem', defaultMessage: '{quantity} {symbol} (bought {date})' },
            {
              quantity: v.quantity,
              symbol:
                v.symbol ||
                intl.formatMessage({ id: 'inbox.server.units', defaultMessage: 'units' }),
              date:
                v.date ||
                intl.formatMessage({ id: 'inbox.server.undated', defaultMessage: 'undated' }),
            },
          ),
        )
        .join(', ')
      return intl.formatMessage(
        {
          id: 'inbox.server.lotSummary',
          defaultMessage:
            'Removed {count} leftover purchase record(s) from positions you had already deleted: {items}. They were still being counted in your net-worth history and returns; your live balances were never affected.',
        },
        { count: p.items.length, items },
      )
    }
    case 'inbox.server.intelSignal':
      return intl.formatMessage({ id: 'inbox.server.intelSignal', defaultMessage: 'Intel signal' })
    case 'inbox.server.notification':
      return intl.formatMessage({ id: 'inbox.server.notification', defaultMessage: 'Notification' })
    case 'inbox.server.holdingTitle':
      return intl.formatMessage({
        id: 'inbox.server.holdingTitle',
        defaultMessage: 'Corrected holding quantities',
      })
    case 'inbox.server.lotTitle':
      return intl.formatMessage({
        id: 'inbox.server.lotTitle',
        defaultMessage: 'Cleaned up leftover holdings',
      })
    case 'inbox.server.agentWroteUnknown':
      return intl.formatMessage({
        id: 'inbox.server.agentWroteUnknown',
        defaultMessage: 'An unattended agent wrote to your ledger',
      })
    case 'inbox.server.agentRefusedUnknown':
      return intl.formatMessage({
        id: 'inbox.server.agentRefusedUnknown',
        defaultMessage: 'An unattended agent attempted a write outside its envelope',
      })
    case 'inbox.server.agentWrote':
      return typeof p.agent === 'string'
        ? intl.formatMessage(
            { id: 'inbox.server.agentWrote', defaultMessage: '{agent} wrote to your ledger' },
            { agent: p.agent },
          )
        : fallback
    case 'inbox.server.agentRefused':
      return typeof p.agent === 'string'
        ? intl.formatMessage(
            {
              id: 'inbox.server.agentRefused',
              defaultMessage: '{agent} attempted a write outside its envelope',
            },
            { agent: p.agent },
          )
        : fallback
    case 'inbox.server.refusedSummary':
      return typeof p.attempted === 'string' && typeof p.reason === 'string'
        ? intl.formatMessage(
            {
              id: 'inbox.server.refusedSummary',
              defaultMessage: 'Refused: {attempted}\nReason: {reason}',
            },
            { attempted: p.attempted, reason: p.reason },
          )
        : fallback
    case 'inbox.server.cliTitle':
      return typeof p.label === 'string' && typeof p.version === 'string'
        ? intl.formatMessage(
            {
              id: 'inbox.server.cliTitle',
              defaultMessage: '{label} {version} changed how tools work',
            },
            { label: p.label, version: p.version },
          )
        : fallback
    case 'inbox.server.cliSummary':
      return typeof p.label === 'string' && typeof p.version === 'string'
        ? intl.formatMessage(
            {
              id: 'inbox.server.cliSummary',
              defaultMessage:
                "{label} {version} changed how tools work — Lucius can't use your book's tools with it. Switch model in Settings or update Open Net Worth.",
            },
            { label: p.label, version: p.version },
          )
        : fallback
    default:
      return fallback
  }
}
