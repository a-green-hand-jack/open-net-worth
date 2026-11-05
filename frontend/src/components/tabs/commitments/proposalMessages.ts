import type { IntlShape } from 'react-intl'
import { fBase } from '../../../utils/format'
import { fmtDate, fmtDay } from '../../../utils/commitments'
import type { Proposal } from './coverageEngine'

/** Only generated proposals carry display metadata; unknown proposals retain their text. */
export function proposalText(
  intl: IntlShape,
  proposal: Proposal,
): { title: string; ribbonHint: string } {
  const d = proposal.display
  if (!d || intl.locale.startsWith('en')) return proposal
  const { formatMessage } = intl
  if (d.kind === 'topup')
    return {
      title: formatMessage(
        { id: 'commitments.proposal.topupTitle', defaultMessage: 'Set aside {amount} now' },
        { amount: fBase(d.amount) },
      ),
      ribbonHint: formatMessage(
        {
          id: 'commitments.proposal.topupHint',
          defaultMessage: 'A one-time {amount} transfer this week would cover the dip.',
        },
        { amount: fBase(d.amount) },
      ),
    }
  if (d.kind === 'defer')
    return {
      title: formatMessage(
        { id: 'commitments.proposal.deferTitle', defaultMessage: 'Push the {label} to {date}' },
        { label: d.label, date: fmtDay(d.date) },
      ),
      ribbonHint: formatMessage(
        {
          id: 'commitments.proposal.deferHint',
          defaultMessage:
            'Pushing "{label}" back until after "{nextLabel}" arrives would also close it.',
        },
        { label: d.label, nextLabel: d.nextLabel },
      ),
    }
  const weeks =
    d.weeks <= 0
      ? formatMessage({
          id: 'commitments.proposal.lessThanWeek',
          defaultMessage: 'less than a week',
        })
      : formatMessage(
          {
            id: 'commitments.proposal.weeks',
            defaultMessage: '{weeks} {weeks, plural, one {week} other {weeks}}',
          },
          { weeks: d.weeks },
        )
  const fix = d.isSale
    ? formatMessage({ id: 'commitments.proposal.sellEarlier', defaultMessage: 'Selling earlier' })
    : formatMessage({
        id: 'commitments.proposal.pullEarlier',
        defaultMessage: 'Pulling that funding forward',
      })
  return {
    title: d.isSale
      ? formatMessage(
          {
            id: 'commitments.proposal.sellTitle',
            defaultMessage: 'Sell earlier: bring "{label}" forward',
          },
          { label: d.label },
        )
      : formatMessage(
          { id: 'commitments.proposal.moveTitle', defaultMessage: 'Bring "{label}" forward' },
          { label: d.label },
        ),
    ribbonHint: formatMessage(
      {
        id: 'commitments.proposal.moveHint',
        defaultMessage:
          'It is funded by "{label}", which does not arrive until {date}, about {weeks} after the payment. {fix} closes the gap without new borrowing.',
      },
      { label: d.label, date: fmtDate(d.date), weeks, fix },
    ),
  }
}
