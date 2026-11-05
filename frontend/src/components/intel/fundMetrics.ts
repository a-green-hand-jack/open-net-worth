import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'

const labels = defineMessages({
  pe_ratio: { id: "intel.fund.label.pe_ratio", defaultMessage: "P/E" },
  forward_pe: { id: "intel.fund.label.forward_pe", defaultMessage: "Fwd P/E" },
  peg_ratio: { id: "intel.fund.label.peg_ratio", defaultMessage: "PEG" },
  price_to_book: { id: "intel.fund.label.price_to_book", defaultMessage: "P/B" },
  ev_to_ebitda: { id: "intel.fund.label.ev_to_ebitda", defaultMessage: "EV/EBITDA" },
  dividend_yield: { id: "intel.fund.label.dividend_yield", defaultMessage: "Yield" },
  eps: { id: "intel.fund.label.eps", defaultMessage: "EPS (ttm)" },
  eps_growth: { id: "intel.fund.label.eps_growth", defaultMessage: "EPS growth" },
  revenue_growth: { id: "intel.fund.label.revenue_growth", defaultMessage: "Rev growth" },
  profit_margin: { id: "intel.fund.label.profit_margin", defaultMessage: "Profit mgn" },
  return_on_equity: { id: "intel.fund.label.return_on_equity", defaultMessage: "ROE" },
  debt_to_equity: { id: "intel.fund.label.debt_to_equity", defaultMessage: "Debt/Equity" },
})
const helps = defineMessages({
  pe_ratio: { id: "intel.fund.help.pe_ratio", defaultMessage: "Trailing price-to-earnings vs sector peers." },
  forward_pe: { id: "intel.fund.help.forward_pe", defaultMessage: "Forward price-to-earnings vs sector peers." },
  peg_ratio: { id: "intel.fund.help.peg_ratio", defaultMessage: "P/E divided by expected earnings growth vs sector peers." },
  price_to_book: { id: "intel.fund.help.price_to_book", defaultMessage: "Price-to-book vs sector peers." },
  ev_to_ebitda: { id: "intel.fund.help.ev_to_ebitda", defaultMessage: "Enterprise value to EBITDA vs sector peers." },
  dividend_yield: { id: "intel.fund.help.dividend_yield", defaultMessage: "Dividend yield vs sector peers." },
  eps: { id: "intel.fund.help.eps", defaultMessage: "Trailing twelve-month earnings per share vs sector peers." },
  eps_growth: { id: "intel.fund.help.eps_growth", defaultMessage: "Year-over-year earnings growth vs sector peers." },
  revenue_growth: { id: "intel.fund.help.revenue_growth", defaultMessage: "Year-over-year revenue growth vs sector peers." },
  profit_margin: { id: "intel.fund.help.profit_margin", defaultMessage: "Net profit margin vs sector peers." },
  return_on_equity: { id: "intel.fund.help.return_on_equity", defaultMessage: "Return on equity vs sector peers." },
  debt_to_equity: { id: "intel.fund.help.debt_to_equity", defaultMessage: "Total debt to equity vs sector peers." },
})

export function fundMetric(id: string, label: string, help: string, intl: IntlShape): { label: string; help: string } {
  if (!Object.hasOwn(labels, id) || !Object.hasOwn(helps, id)) return { label, help }
  return { label: intl.formatMessage(labels[id as keyof typeof labels] as MessageDescriptor), help: intl.formatMessage(helps[id as keyof typeof helps] as MessageDescriptor) }
}
