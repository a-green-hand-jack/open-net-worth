import { formatImportCount } from './labels'
import { getNumberLocale } from '../../../utils/format'
import { verificationMessage } from './verificationMessages'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { importHint } from './importMessages'
import { FormattedMessage } from './FormattedMessage'
import { Badge, CollapsibleSection, Stack, Text } from '../../ui'
import type { Check, Counts, Problem, Verification } from './runs'

// The tables of a run report. Rows are `<tr>`s, but on a phone each one stacks into labelled
// lines (`.imp-table` in index.css, from the `data-label` of each cell).

const ITEMS: { key: string; label: string }[] = [
  { key: 'accounts', label: 'Accounts' },
  { key: 'categories', label: 'Categories' },
  { key: 'envelopes', label: 'Envelopes' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'assigned', label: 'Assigned months' },
]

const fmt = (v: number | string) =>
  typeof v === 'number'
    ? v.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v


// A transaction count is a whole number; only money carries two decimals.
const show = (v: number | string, unit: Check['unit']) =>
  unit === 'count' && typeof v === 'number' ? new Intl.NumberFormat(getNumberLocale(), { maximumFractionDigits: 0 }).format(v) : fmt(v)

const signed = (v: number, unit: Check['unit']) => `${v > 0 ? '+' : ''}${show(v, unit)}`

export function ResultsTable({ counts }: { counts: Record<string, Counts> }) {
  const intl = useAppIntl()
  const rows = ITEMS.flatMap((i) => {
    const c = counts[i.key]
    return c ? [{ ...i, c }] : []
  })
  if (rows.length === 0) {
    return (
      <Text size="sm" tone="faint">
        {<FormattedMessage id="imports.static.3517ff30" defaultMessage={"Nothing booked yet."} />}
      </Text>
    )
  }
  return (
    <table className="imp-table">
      <thead>
        <tr>
          <th>{<FormattedMessage id="imports.static.bf298a20" defaultMessage={"Item"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.7d808e24" defaultMessage={"Created"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.2e5fbec0" defaultMessage={"Already there"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.3f6e87e0" defaultMessage={"Refused"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.9927a641" defaultMessage={"Failed"} />}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, c }) => (
          <tr key={key}>
            <td data-label={intl.formatMessage({ id: 'imports.report.item', defaultMessage: 'Item' })}>{intl.formatMessage({ id: 'imports.report.countKind', defaultMessage: '{kind, select, accounts {Accounts} categories {Categories} envelopes {Envelopes} transactions {Transactions} other {Assigned months}}' }, { kind: key })}</td>
            <td data-label={intl.formatMessage({ id: 'imports.report.created', defaultMessage: 'Created' })} className="imp-table__num">
              {formatImportCount(c.created)}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.report.alreadyThere', defaultMessage: 'Already there' })} className="imp-table__num">
              {formatImportCount(c.existing)}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.report.refused', defaultMessage: 'Refused' })} className="imp-table__num">
              {formatImportCount(c.refused)}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.report.failed', defaultMessage: 'Failed' })} className="imp-table__num">
              {formatImportCount(c.failed)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ProblemList({ problems }: { problems: Problem[] }) {
  const intl = useAppIntl()
  return (
    <Stack gap="--space-3">
      {problems.map((p, i) => (
        <div key={`${p.item}-${i}`}>
          <Text size="sm" weight={600}>
            {p.item}
          </Text>
          {p.reason && (
            <Text as="div" size="sm">
              {p.reason}
            </Text>
          )}
          {p.hint && (
            <Text as="div" size="xs" tone="faint">
              {importHint(intl, p.hint_message, p.hint)}
            </Text>
          )}
        </div>
      ))}
    </Stack>
  )
}

function ChecksTable({ checks }: { checks: Check[] }) {
  const intl = useAppIntl()
  return (
    <table className="imp-table">
      <thead>
        <tr>
          <th>{<FormattedMessage id="imports.static.fd4f8317" defaultMessage={"Check"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.9cf56106" defaultMessage={"YNAB"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.a68579de" defaultMessage={"Open Net Worth"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.9c6b495e" defaultMessage={"Difference"} />}</th>
        </tr>
      </thead>
      <tbody>
        {checks.map((c, i) => (
          <tr key={`${c.check}-${i}`}>
            <td data-label={intl.formatMessage({ id: 'imports.report.check', defaultMessage: 'Check' })} className="imp-table__wrap">
              {verificationMessage(intl, c.check_message, c.check)}
              {c.note && (
                <Text as="div" size="2xs" tone="faint">
                  {verificationMessage(intl, c.note_message, c.note, c.note_details)}
                </Text>
              )}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.report.ynab', defaultMessage: 'YNAB' })} className="imp-table__num">
              {typeof c.ynab_value === 'string' ? verificationMessage(intl, c.ynab_value_message, c.ynab_value) : show(c.ynab_value, c.unit)}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.report.onw', defaultMessage: 'Open Net Worth' })} className="imp-table__num">
              {typeof c.onw_value === 'string' ? verificationMessage(intl, c.onw_value_message, c.onw_value) : show(c.onw_value, c.unit)}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.report.difference', defaultMessage: 'Difference' })} className="imp-table__num">
              {c.difference == null ? '—' : signed(c.difference, c.unit)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Mismatches come first; the checks that agree stay one click away.
export function VerificationBody({ verification: v }: { verification: Verification }) {
  const intl = useAppIntl()
  return (
    <Stack gap="--space-4">
      <Badge tone={v.ok ? 'pos' : 'neg'}>
        {v.ok ? intl.formatMessage({ id: 'imports.report.allMatch', defaultMessage: 'All match' }) : intl.formatMessage({ id: 'imports.report.toReview', defaultMessage: '{count} to look at' }, { count: formatImportCount(v.mismatches.length) })}
      </Badge>
      {v.mismatches.length > 0 && <ChecksTable checks={v.mismatches} />}
      {!v.ok && (
        <Text size="xs" tone="faint">
          {intl.formatMessage({ id: 'imports.report.differenceHelp', defaultMessage: 'A transaction count that differs usually means a row was not booked (listed under Needs attention). An envelope or Ready to Assign difference means the two apps’ budget rules gave different numbers for your history; compare that month in both before relying on it.' })}
        </Text>
      )}
      {v.matches.length > 0 && (
        <CollapsibleSection title={intl.formatMessage({ id: 'imports.report.showMatches', defaultMessage: 'Show all {count} that match' }, { count: formatImportCount(v.matches.length) })}>
          <ChecksTable checks={v.matches} />
        </CollapsibleSection>
      )}
    </Stack>
  )
}
