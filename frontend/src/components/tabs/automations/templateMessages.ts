import { defineMessages, type IntlShape } from 'react-intl'
import { ALL_TEMPLATES, type AutomationTemplate } from './automationTemplates'

const names = defineMessages({
  mail_ledger: {
    id: 'automations.template.mail_ledger.name',
    defaultMessage: 'Auto-log transactions from email',
  },
  'daily-briefing': {
    id: 'automations.template.daily-briefing.name',
    defaultMessage: 'Daily briefing',
  },
  'weekly-report': {
    id: 'automations.template.weekly-report.name',
    defaultMessage: 'Weekly report',
  },
  'monthly-report': {
    id: 'automations.template.monthly-report.name',
    defaultMessage: 'Monthly report',
  },
  subscriptions: {
    id: 'automations.template.subscriptions.name',
    defaultMessage: 'Subscription creep',
  },
  pacing: { id: 'automations.template.pacing.name', defaultMessage: 'Budget pacing' },
  floor: { id: 'automations.template.floor.name', defaultMessage: 'Cash floor guard' },
  'large-charge': {
    id: 'automations.template.large-charge.name',
    defaultMessage: 'Large charge alert',
  },
  'new-payee': { id: 'automations.template.new-payee.name', defaultMessage: 'New payee check' },
  drift: { id: 'automations.template.drift.name', defaultMessage: 'Portfolio drift' },
  sync_simplefin: {
    id: 'automations.template.sync_simplefin.name',
    defaultMessage: 'Sync SimpleFIN',
  },
  sync_plaid: { id: 'automations.template.sync_plaid.name', defaultMessage: 'Sync Plaid' },
  sync_lunch_money: {
    id: 'automations.template.sync_lunch_money.name',
    defaultMessage: 'Sync Lunch Money',
  },
  sync_lunch_flow: {
    id: 'automations.template.sync_lunch_flow.name',
    defaultMessage: 'Sync Lunch Flow',
  },
  sync_ynab: { id: 'automations.template.sync_ynab.name', defaultMessage: 'Sync YNAB' },
  sync_enable_banking: {
    id: 'automations.template.sync_enable_banking.name',
    defaultMessage: 'Sync Enable Banking',
  },
  sync_gocardless: {
    id: 'automations.template.sync_gocardless.name',
    defaultMessage: 'Sync GoCardless',
  },
  sync_alpaca: { id: 'automations.template.sync_alpaca.name', defaultMessage: 'Sync Alpaca' },
  sync_ibkr: {
    id: 'automations.template.sync_ibkr.name',
    defaultMessage: 'Sync Interactive Brokers',
  },
})
const descriptions = defineMessages({
  mail_ledger: {
    id: 'automations.template.mail_ledger.description',
    defaultMessage:
      'Reads bank, card and trade confirmation mail and logs it — payees resolved, nothing double-booked.',
  },
  'daily-briefing': {
    id: 'automations.template.daily-briefing.description',
    defaultMessage: "A short, friendly update on yesterday's money and investments.",
  },
  'weekly-report': {
    id: 'automations.template.weekly-report.description',
    defaultMessage: 'How last week went: spending, bills, investments and anything unusual.',
  },
  'monthly-report': {
    id: 'automations.template.monthly-report.description',
    defaultMessage: 'How last month went: what you earned and kept, spending and investments.',
  },
  subscriptions: {
    id: 'automations.template.subscriptions.description',
    defaultMessage: 'Flags renewals that came in higher than the time before.',
  },
  pacing: {
    id: 'automations.template.pacing.description',
    defaultMessage: 'Which envelopes are running hot.',
  },
  floor: {
    id: 'automations.template.floor.description',
    defaultMessage: 'Warns when the buffer looks thin for the fortnight ahead.',
  },
  'large-charge': {
    id: 'automations.template.large-charge.description',
    defaultMessage: 'Fires the moment a charge over your threshold lands.',
  },
  'new-payee': {
    id: 'automations.template.new-payee.description',
    defaultMessage: 'Every first-time payee gets a second look.',
  },
  drift: {
    id: 'automations.template.drift.description',
    defaultMessage: 'Checks allocation against target.',
  },
  sync_simplefin: {
    id: 'automations.template.sync_simplefin.description',
    defaultMessage: 'Fetch new SimpleFIN transactions and book them.',
  },
  sync_plaid: {
    id: 'automations.template.sync_plaid.description',
    defaultMessage: 'Fetch new Plaid transactions and book them.',
  },
  sync_lunch_money: {
    id: 'automations.template.sync_lunch_money.description',
    defaultMessage: 'Fetch new Lunch Money transactions and book them.',
  },
  sync_lunch_flow: {
    id: 'automations.template.sync_lunch_flow.description',
    defaultMessage: 'Fetch new Lunch Flow transactions and book them.',
  },
  sync_ynab: {
    id: 'automations.template.sync_ynab.description',
    defaultMessage: 'One way: Lucius fetches new YNAB transactions and books them here.',
  },
  sync_enable_banking: {
    id: 'automations.template.sync_enable_banking.description',
    defaultMessage: 'Fetch new Enable Banking transactions and book them.',
  },
  sync_gocardless: {
    id: 'automations.template.sync_gocardless.description',
    defaultMessage: 'Fetch new GoCardless transactions and book them.',
  },
  sync_alpaca: {
    id: 'automations.template.sync_alpaca.description',
    defaultMessage: 'Fetch Alpaca positions and keep the portfolio current.',
  },
  sync_ibkr: {
    id: 'automations.template.sync_ibkr.description',
    defaultMessage: 'Fetch IBKR activity and book trades and cash events.',
  },
})

const instructions = defineMessages({
  mail_ledger: {
    id: 'automations.template.mail_ledger.instructions',
    defaultMessage:
      'Check my email for bank, card and trade confirmations and log them, using the Log transactions from email skill. Message me with what you logged, or if anything went wrong.',
  },
  'daily-briefing': {
    id: 'automations.template.daily-briefing.instructions',
    defaultMessage:
      "Send me my daily briefing on yesterday, using the Daily briefing skill. Send it on Telegram, or by webhook if that's what I use; if I have neither, show it here.",
  },
  'weekly-report': {
    id: 'automations.template.weekly-report.instructions',
    defaultMessage:
      "Send me my weekly report for last week, using the Weekly report skill. Add a short note of a few lines to go with it. Send it on Telegram, or by webhook if that's what I use; if I have neither, show it here. Don't change anything in my records.",
  },
  'monthly-report': {
    id: 'automations.template.monthly-report.instructions',
    defaultMessage:
      "Send me my monthly report for last month, using the Monthly report skill. Add a short note of a few lines to go with it. Send it on Telegram, or by webhook if that's what I use; if I have neither, show it here. Don't change anything in my records.",
  },
  subscriptions: {
    id: 'automations.template.subscriptions.instructions',
    defaultMessage:
      'List every subscription that renewed at a higher price than the time before, with the old and new amount, plus anything I have not used in 60 days.',
  },
  pacing: {
    id: 'automations.template.pacing.instructions',
    defaultMessage:
      'Compare each envelope to where it should be this far into the month. Name the two most at risk and the daily amount they need to slow to.',
  },
  floor: {
    id: 'automations.template.floor.instructions',
    defaultMessage:
      'Project checking forward two weeks using known commitments and typical spending. If the projected low point falls under my floor, warn me with the date and the shortfall.',
  },
  'large-charge': {
    id: 'automations.template.large-charge.instructions',
    defaultMessage:
      'Tell me the payee, the account, whether I have used them before, and whether the charge looks like a duplicate. Two lines unless something is wrong.',
  },
  'new-payee': {
    id: 'automations.template.new-payee.instructions',
    defaultMessage:
      'If this transaction is from a payee I have never used before, tell me who they are, what the charge was for if you can tell, and whether the amount is typical for that kind of merchant. Otherwise do nothing.',
  },
  drift: {
    id: 'automations.template.drift.instructions',
    defaultMessage:
      'Compare my actual allocation to the target mix. Show the drift per sleeve in percentage points and the trade sizes that would bring it back, but do not place anything.',
  },
  sync_simplefin: {
    id: 'automations.template.sync_simplefin.instructions',
    defaultMessage:
      'Fetch new SimpleFIN transactions and book them. Use the linked account for each one. If an account isn’t linked, ask me instead of guessing. Pick a category from the merchant or the bank’s category hint when it clearly matches one of mine and the payee has no default category of its own; otherwise leave it empty. If the bank changed something already booked, bring it in line, but never override something I changed by hand. If the bank withdrew a transaction it already booked, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
  sync_plaid: {
    id: 'automations.template.sync_plaid.instructions',
    defaultMessage:
      'Fetch new Plaid transactions and book them. Use the linked account for each one. If an account isn’t linked, ask me instead of guessing. Pick a category from the merchant or the bank’s category hint when it clearly matches one of mine and the payee has no default category of its own; otherwise leave it empty. If the bank changed something already booked, bring it in line, but never override something I changed by hand. If the bank withdrew a transaction it already booked, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
  sync_lunch_money: {
    id: 'automations.template.sync_lunch_money.instructions',
    defaultMessage:
      'Fetch new Lunch Money transactions and book them. Use the linked account for each one. If an account isn’t linked, ask me instead of guessing. Pick a category from the merchant or the bank’s category hint when it clearly matches one of mine and the payee has no default category of its own; otherwise leave it empty. If the bank changed something already booked, bring it in line, but never override something I changed by hand. If the bank withdrew a transaction it already booked, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
  sync_lunch_flow: {
    id: 'automations.template.sync_lunch_flow.instructions',
    defaultMessage:
      'Fetch new Lunch Flow transactions and book them. Use the linked account for each one. If an account isn’t linked, ask me instead of guessing. Pick a category from the merchant or the bank’s category hint when it clearly matches one of mine and the payee has no default category of its own; otherwise leave it empty. If the bank changed something already booked, bring it in line, but never override something I changed by hand. If the bank withdrew a transaction it already booked, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
  sync_ynab: {
    id: 'automations.template.sync_ynab.instructions',
    defaultMessage:
      'Fetch new YNAB transactions and book them. Use the linked account for each one. If an account isn’t linked, ask me instead of guessing. Pick a category from the merchant or the bank’s category hint when it clearly matches one of mine and the payee has no default category of its own; otherwise leave it empty. If the bank changed something already booked, bring it in line, but never override something I changed by hand. If the bank withdrew a transaction it already booked, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
  sync_enable_banking: {
    id: 'automations.template.sync_enable_banking.instructions',
    defaultMessage:
      'Fetch new Enable Banking transactions and book them. Use the linked account for each one. If an account isn’t linked, ask me instead of guessing. Pick a category from the merchant or the bank’s category hint when it clearly matches one of mine and the payee has no default category of its own; otherwise leave it empty. If the bank changed something already booked, bring it in line, but never override something I changed by hand. If the bank withdrew a transaction it already booked, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
  sync_gocardless: {
    id: 'automations.template.sync_gocardless.instructions',
    defaultMessage:
      'Fetch new GoCardless transactions and book them. Use the linked account for each one. If an account isn’t linked, ask me instead of guessing. Pick a category from the merchant or the bank’s category hint when it clearly matches one of mine and the payee has no default category of its own; otherwise leave it empty. If the bank changed something already booked, bring it in line, but never override something I changed by hand. If the bank withdrew a transaction it already booked, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
  sync_alpaca: {
    id: 'automations.template.sync_alpaca.instructions',
    defaultMessage:
      'Fetch my Alpaca positions and cash. Add or update positions from the snapshot. Never remove a position; tell me about any that are missing. Message me only when something changed or something went wrong.',
  },
  sync_ibkr: {
    id: 'automations.template.sync_ibkr.instructions',
    defaultMessage:
      'Fetch new IBKR activity and book it. Add or update positions from the snapshot. Never remove a position; tell me about any that are missing. Use the linked account for each transaction; if it isn’t linked, ask me instead of guessing. If something changed after booking, bring it in line, but never override something I changed by hand. If something was withdrawn, flag it and tell me. Never delete anything. Message me only when something was booked or something went wrong.',
  },
})

export function templateText(intl: IntlShape, template: AutomationTemplate) {
  const name = names[template.key as keyof typeof names]
  const description = descriptions[template.key as keyof typeof descriptions]
  const instruction = instructions[template.key as keyof typeof instructions]
  return {
    name: name ? intl.formatMessage(name) : template.name,
    description: description ? intl.formatMessage(description) : template.description,
    instructions: instruction ? intl.formatMessage(instruction) : template.instructions,
  }
}

export function templateField(
  intl: IntlShape,
  field: 'name' | 'description' | 'instructions',
  value: string,
  key?: string,
): string {
  const template = ALL_TEMPLATES.find((item) => item.key === key)
  if (!template || value !== template[field]) return value
  return templateText(intl, template)[field] ?? value
}
