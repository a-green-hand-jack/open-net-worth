import { defineMessages, type IntlShape } from 'react-intl'
import type { WidgetDefinition } from './types'

const titles = defineMessages({
  hero: { id: 'overview.widgetTitle.hero', defaultMessage: 'Net worth' },
  'networth-nums': { id: 'overview.widgetTitle.networth-nums', defaultMessage: 'Net worth' },
  'networth-chart': {
    id: 'overview.widgetTitle.networth-chart',
    defaultMessage: 'Net worth trend',
  },
  alloc: { id: 'overview.widgetTitle.alloc', defaultMessage: 'By asset class' },
  reach: { id: 'overview.widgetTitle.reach', defaultMessage: 'Reachability' },
  venues: { id: 'overview.widgetTitle.venues', defaultMessage: "Where it's held" },
  attention: { id: 'overview.widgetTitle.attention', defaultMessage: 'Needs attention' },
  briefing: { id: 'overview.widgetTitle.briefing', defaultMessage: "Lucius's daily briefing" },
  'lux-ask': { id: 'overview.widgetTitle.lux-ask', defaultMessage: 'Ask Lucius' },
  summary: { id: 'overview.widgetTitle.summary', defaultMessage: 'Summary' },
  upcoming: { id: 'overview.widgetTitle.upcoming', defaultMessage: 'Next 30 days' },
  spending: { id: 'overview.widgetTitle.spending', defaultMessage: 'Spending pulse' },
  cashflow: { id: 'overview.widgetTitle.cashflow', defaultMessage: 'Cash flow' },
  calendar: { id: 'overview.widgetTitle.calendar', defaultMessage: 'Calendar' },
  'recent-added-txns': {
    id: 'overview.widgetTitle.recent-added-txns',
    defaultMessage: 'Recently added',
  },
  'recent-txns': { id: 'overview.widgetTitle.recent-txns', defaultMessage: 'Recent transactions' },
  'category-txns': {
    id: 'overview.widgetTitle.category-txns',
    defaultMessage: 'Category transactions',
  },
  subscriptions: { id: 'overview.widgetTitle.subscriptions', defaultMessage: 'Subscriptions' },
  movers: { id: 'overview.widgetTitle.movers', defaultMessage: "Today's movers" },
  fx: { id: 'overview.widgetTitle.fx', defaultMessage: 'FX rates' },
  dividends: { id: 'overview.widgetTitle.dividends', defaultMessage: 'Dividends' },
  'rep-treemap': { id: 'overview.widgetTitle.rep-treemap', defaultMessage: 'Holdings map' },
  'inv-drift': { id: 'overview.widgetTitle.inv-drift', defaultMessage: 'Allocation drift' },
  'inv-perf': { id: 'overview.widgetTitle.inv-perf', defaultMessage: 'Performance' },
  'inv-gains': { id: 'overview.widgetTitle.inv-gains', defaultMessage: 'Unrealized gains' },
  'inv-divfc': { id: 'overview.widgetTitle.inv-divfc', defaultMessage: 'Dividend forecast' },
  'spending-pace': { id: 'overview.widgetTitle.spending-pace', defaultMessage: 'Spending pace' },
  goals: { id: 'overview.widgetTitle.goals', defaultMessage: 'Goals' },
  crossover: { id: 'overview.widgetTitle.crossover', defaultMessage: 'Crossover point' },
  'plan-fire': { id: 'overview.widgetTitle.plan-fire', defaultMessage: 'FIRE projection' },
  'plan-runway': { id: 'overview.widgetTitle.plan-runway', defaultMessage: 'Cash-flow runway' },
  'rep-spendcat': {
    id: 'overview.widgetTitle.rep-spendcat',
    defaultMessage: 'Spending by category',
  },
  'rep-trends': { id: 'overview.widgetTitle.rep-trends', defaultMessage: 'Spending trends' },
  'rep-incexp': { id: 'overview.widgetTitle.rep-incexp', defaultMessage: 'Income vs expense' },
  'rep-table': { id: 'overview.widgetTitle.rep-table', defaultMessage: 'Income & expense table' },
  'rep-savings': { id: 'overview.widgetTitle.rep-savings', defaultMessage: 'Savings rate' },
  'rep-merchants': { id: 'overview.widgetTitle.rep-merchants', defaultMessage: 'Top merchants' },
  'rep-sankey': { id: 'overview.widgetTitle.rep-sankey', defaultMessage: 'Money flow' },
  text: { id: 'overview.widgetTitle.text', defaultMessage: 'Text' },
  image: { id: 'overview.widgetTitle.image', defaultMessage: 'Image' },
  embed: { id: 'overview.widgetTitle.embed', defaultMessage: 'Embed' },
  'lux-coffee': { id: 'overview.widgetTitle.lux-coffee', defaultMessage: 'Coffee • weekly spend' },
  'lux-html': { id: 'overview.widgetTitle.lux-html', defaultMessage: 'Lucius custom' },
  'ins-debt': { id: 'overview.widgetTitle.ins-debt', defaultMessage: 'Debt paydown' },
  'bud-vsactual': { id: 'overview.widgetTitle.bud-vsactual', defaultMessage: 'Budget vs actual' },
})

export function localizeWidgetTitle(intl: IntlShape, def: WidgetDefinition): WidgetDefinition {
  const message = titles[def.defId as keyof typeof titles]
  return message ? { ...def, title: intl.formatMessage(message) } : def
}

const labels = defineMessages({
  hero: { id: 'overview.widgetlabel.hero', defaultMessage: 'Net worth & trend' },
  'networth-nums': {
    id: 'overview.widgetlabel.networth-nums',
    defaultMessage: 'Net worth (numbers)',
  },
  'networth-chart': {
    id: 'overview.widgetlabel.networth-chart',
    defaultMessage: 'Net worth chart',
  },
  alloc: { id: 'overview.widgetlabel.alloc', defaultMessage: 'Asset allocation' },
  reach: { id: 'overview.widgetlabel.reach', defaultMessage: 'Reachability' },
  venues: { id: 'overview.widgetlabel.venues', defaultMessage: 'Where money is held' },
  attention: { id: 'overview.widgetlabel.attention', defaultMessage: 'Needs attention' },
  briefing: { id: 'overview.widgetlabel.briefing', defaultMessage: 'Daily briefing' },
  'lux-ask': { id: 'overview.widgetlabel.lux-ask', defaultMessage: 'Ask Lucius' },
  summary: { id: 'overview.widgetlabel.summary', defaultMessage: 'Summary card' },
  upcoming: { id: 'overview.widgetlabel.upcoming', defaultMessage: 'Next 30 days' },
  spending: { id: 'overview.widgetlabel.spending', defaultMessage: 'Spending pulse' },
  cashflow: { id: 'overview.widgetlabel.cashflow', defaultMessage: 'Cash flow' },
  calendar: { id: 'overview.widgetlabel.calendar', defaultMessage: 'Calendar card' },
  'recent-added-txns': {
    id: 'overview.widgetlabel.recent-added-txns',
    defaultMessage: 'Recently added',
  },
  'recent-txns': { id: 'overview.widgetlabel.recent-txns', defaultMessage: 'Recent transactions' },
  'category-txns': {
    id: 'overview.widgetlabel.category-txns',
    defaultMessage: 'Category transactions',
  },
  subscriptions: { id: 'overview.widgetlabel.subscriptions', defaultMessage: 'Subscriptions' },
  movers: { id: 'overview.widgetlabel.movers', defaultMessage: "Today's movers" },
  fx: { id: 'overview.widgetlabel.fx', defaultMessage: 'FX rates' },
  dividends: { id: 'overview.widgetlabel.dividends', defaultMessage: 'Dividends' },
  'rep-treemap': { id: 'overview.widgetlabel.rep-treemap', defaultMessage: 'Holdings map' },
  'inv-drift': { id: 'overview.widgetlabel.inv-drift', defaultMessage: 'Allocation drift' },
  'inv-perf': { id: 'overview.widgetlabel.inv-perf', defaultMessage: 'Performance vs benchmark' },
  'inv-gains': { id: 'overview.widgetlabel.inv-gains', defaultMessage: 'Unrealized gains' },
  'inv-divfc': { id: 'overview.widgetlabel.inv-divfc', defaultMessage: 'Dividend forecast' },
  'spending-pace': { id: 'overview.widgetlabel.spending-pace', defaultMessage: 'Spending pace' },
  goals: { id: 'overview.widgetlabel.goals', defaultMessage: 'Goals' },
  crossover: { id: 'overview.widgetlabel.crossover', defaultMessage: 'Crossover point' },
  'plan-fire': { id: 'overview.widgetlabel.plan-fire', defaultMessage: 'FIRE projection' },
  'plan-runway': { id: 'overview.widgetlabel.plan-runway', defaultMessage: 'Cash-flow runway' },
  'rep-spendcat': {
    id: 'overview.widgetlabel.rep-spendcat',
    defaultMessage: 'Spending by category',
  },
  'rep-trends': { id: 'overview.widgetlabel.rep-trends', defaultMessage: 'Spending trends' },
  'rep-incexp': {
    id: 'overview.widgetlabel.rep-incexp',
    defaultMessage: 'Income vs expense (chart)',
  },
  'rep-table': { id: 'overview.widgetlabel.rep-table', defaultMessage: 'Income & expense table' },
  'rep-savings': { id: 'overview.widgetlabel.rep-savings', defaultMessage: 'Savings rate' },
  'rep-merchants': { id: 'overview.widgetlabel.rep-merchants', defaultMessage: 'Top merchants' },
  'rep-sankey': { id: 'overview.widgetlabel.rep-sankey', defaultMessage: 'Money flow' },
  text: { id: 'overview.widgetlabel.text', defaultMessage: 'Text widget' },
  image: { id: 'overview.widgetlabel.image', defaultMessage: 'Image' },
  embed: { id: 'overview.widgetlabel.embed', defaultMessage: 'Embed' },
  'lux-coffee': { id: 'overview.widgetlabel.lux-coffee', defaultMessage: 'Coffee • weekly spend' },
  'lux-html': { id: 'overview.widgetlabel.lux-html', defaultMessage: 'Lucius custom' },
  'ins-debt': { id: 'overview.widgetlabel.ins-debt', defaultMessage: 'Debt paydown' },
  'bud-vsactual': { id: 'overview.widgetlabel.bud-vsactual', defaultMessage: 'Budget vs actual' },
})

const descs = defineMessages({
  hero: {
    id: 'overview.widgetdesc.hero',
    defaultMessage: 'Headline number, trend chart with market-vs-saved split, key stats.',
  },
  'networth-nums': {
    id: 'overview.widgetdesc.networth-nums',
    defaultMessage: 'Headline net worth, change, and the key figures — no chart.',
  },
  'networth-chart': {
    id: 'overview.widgetdesc.networth-chart',
    defaultMessage: 'Just the trend / composition chart — no headline or figures.',
  },
  alloc: {
    id: 'overview.widgetdesc.alloc',
    defaultMessage: 'Your money by asset class — list, bar chart, or pie.',
  },
  reach: {
    id: 'overview.widgetdesc.reach',
    defaultMessage: 'How quickly you can reach your money — list, bar, or pie.',
  },
  venues: {
    id: 'overview.widgetdesc.venues',
    defaultMessage: 'Value by account and venue — list, bar, or pie.',
  },
  attention: {
    id: 'overview.widgetdesc.attention',
    defaultMessage: 'Prioritized flags — overdue payments, shortfalls, risks — with actions.',
  },
  briefing: {
    id: 'overview.widgetdesc.briefing',
    defaultMessage: "Lucius' morning note and suggested questions.",
  },
  'lux-ask': {
    id: 'overview.widgetdesc.lux-ask',
    defaultMessage:
      'Ask Lucius anything about your money — opens the real assistant panel with your question.',
  },
  summary: {
    id: 'overview.widgetdesc.summary',
    defaultMessage: 'A single headline figure with its month-to-date change.',
  },
  upcoming: {
    id: 'overview.widgetdesc.upcoming',
    defaultMessage:
      'Money going out soon (installments, auto-debits, set-asides) and recurring income due in the same 30 days.',
  },
  spending: {
    id: 'overview.widgetdesc.spending',
    defaultMessage: "Budget envelopes month to date — what's on pace, what's over.",
  },
  cashflow: {
    id: 'overview.widgetdesc.cashflow',
    defaultMessage: 'Money in vs out this month, and the net.',
  },
  calendar: {
    id: 'overview.widgetdesc.calendar',
    defaultMessage: 'Money in and out by day across the month.',
  },
  'recent-added-txns': {
    id: 'overview.widgetdesc.recent-added-txns',
    defaultMessage:
      'The last transactions entered into the ledger — newest INSERTED first, not newest dated.',
  },
  'recent-txns': {
    id: 'overview.widgetdesc.recent-txns',
    defaultMessage: 'The most recent transactions by date.',
  },
  'category-txns': {
    id: 'overview.widgetdesc.category-txns',
    defaultMessage:
      'Recent transactions in the categories you pick — subscriptions, groceries, anything.',
  },
  subscriptions: {
    id: 'overview.widgetdesc.subscriptions',
    defaultMessage:
      'Recent charges in your Subscriptions category — add more categories in its settings.',
  },
  movers: {
    id: 'overview.widgetdesc.movers',
    defaultMessage: 'Biggest position moves today (also on Investments).',
  },
  fx: {
    id: 'overview.widgetdesc.fx',
    defaultMessage: "Currencies behind your foreign holdings, with today's move.",
  },
  dividends: {
    id: 'overview.widgetdesc.dividends',
    defaultMessage: "Upcoming payouts and what you've received this year.",
  },
  'rep-treemap': {
    id: 'overview.widgetdesc.rep-treemap',
    defaultMessage: "Treemap heatmap of holdings — size = position value, color = today's move.",
  },
  'inv-drift': {
    id: 'overview.widgetdesc.inv-drift',
    defaultMessage: 'Actual vs target asset mix, with rebalance nudge.',
  },
  'inv-perf': {
    id: 'overview.widgetdesc.inv-perf',
    defaultMessage: 'Your return vs an index over the last 12 months.',
  },
  'inv-gains': {
    id: 'overview.widgetdesc.inv-gains',
    defaultMessage: 'Market value vs cost basis and unrealized P/L per holding.',
  },
  'inv-divfc': {
    id: 'overview.widgetdesc.inv-divfc',
    defaultMessage: 'Expected dividend income by month over the next year.',
  },
  'spending-pace': {
    id: 'overview.widgetdesc.spending-pace',
    defaultMessage: 'Category spending pace vs budget for the current month.',
  },
  goals: {
    id: 'overview.widgetdesc.goals',
    defaultMessage: 'Progress toward savings targets from your Plan.',
  },
  crossover: {
    id: 'overview.widgetdesc.crossover',
    defaultMessage: 'When passive income is projected to cover your spending.',
  },
  'plan-fire': {
    id: 'overview.widgetdesc.plan-fire',
    defaultMessage: 'Compact path to financial independence — net worth vs FIRE number.',
  },
  'plan-runway': {
    id: 'overview.widgetdesc.plan-runway',
    defaultMessage: 'Compact runway — how long cash lasts if income stopped.',
  },
  'rep-spendcat': {
    id: 'overview.widgetdesc.rep-spendcat',
    defaultMessage: 'Where money goes this month — donut, bar, or list.',
  },
  'rep-trends': {
    id: 'overview.widgetdesc.rep-trends',
    defaultMessage:
      'Monthly spend stacked by category over the last 6 months, against your average.',
  },
  'rep-incexp': {
    id: 'overview.widgetdesc.rep-incexp',
    defaultMessage: 'Money in vs out, month by month — totals, or stacked by category.',
  },
  'rep-table': {
    id: 'overview.widgetdesc.rep-table',
    defaultMessage:
      'Hierarchical income/spending breakdown with this-month, average, and total columns.',
  },
  'rep-savings': {
    id: 'overview.widgetdesc.rep-savings',
    defaultMessage: 'Share of income saved this month, as a gauge.',
  },
  'rep-merchants': {
    id: 'overview.widgetdesc.rep-merchants',
    defaultMessage: 'Where you spent the most this month, ranked — list, bar, or pie.',
  },
  'rep-sankey': {
    id: 'overview.widgetdesc.rep-sankey',
    defaultMessage: 'Where income comes from and where it goes — flow diagram.',
  },
  text: {
    id: 'overview.widgetdesc.text',
    defaultMessage: 'A Markdown note — headings, bold, lists, links.',
  },
  image: {
    id: 'overview.widgetdesc.image',
    defaultMessage: 'A picture — your goal, a chart screenshot, a family photo.',
  },
  embed: {
    id: 'overview.widgetdesc.embed',
    defaultMessage: 'An external page — a sheet, a TradingView chart, a doc.',
  },
  'lux-coffee': {
    id: 'overview.widgetdesc.lux-coffee',
    defaultMessage: 'Custom widget built by Lucius.',
  },
  'lux-html': {
    id: 'overview.widgetdesc.lux-html',
    defaultMessage: 'Free-form widget — a Lucius-generated artifact pinned to your dashboard.',
  },
  'ins-debt': {
    id: 'overview.widgetdesc.ins-debt',
    defaultMessage: 'Projected payoff curve and balances by liability.',
  },
  'bud-vsactual': {
    id: 'overview.widgetdesc.bud-vsactual',
    defaultMessage: 'Category budgets with spent / budgeted progress bars.',
  },
})

export function localizeWidgetDefinition(intl: IntlShape, def: WidgetDefinition): WidgetDefinition {
  const label = labels[def.defId as keyof typeof labels]
  const desc = descs[def.defId as keyof typeof descs]
  const titled = localizeWidgetTitle(intl, def)
  return {
    ...titled,
    label: label ? intl.formatMessage(label) : def.label,
    desc: desc ? intl.formatMessage(desc) : def.desc,
  }
}
