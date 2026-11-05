/**
 * BalanceTermsInfo.tsx — the one "i" beside a balance card's title. It explains all three figures
 * at once; an "i" under each 16px label was three hard-to-hit targets saying a line each
 * (owner, 2026-10-26).
 */

import { InfoPopover } from '../../ui'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function BalanceTermsInfo({ total, meaning }: { total: string; meaning: string }) {
  const { formatMessage } = useAppIntl()
  return (
    <InfoPopover
      width={280}
      label={formatMessage({
        id: 'accounts.figuresMeaning',
        defaultMessage: 'What these figures mean',
      })}
      text={
        <span className="acct-bal-terms">
          <span>
            {formatMessage(
              {
                id: 'accounts.clearedMeaning',
                defaultMessage: "<term>Cleared</term> — posted; the amount won't change.",
              },
              { term: (chunks) => <b>{chunks}</b> },
            )}
          </span>
          <span>
            {formatMessage(
              {
                id: 'accounts.unclearedMeaning',
                defaultMessage: '<term>Uncleared</term> — pending holds that can still change.',
              },
              { term: (chunks) => <b>{chunks}</b> },
            )}
          </span>
          <span>
            {formatMessage(
              { id: 'accounts.totalMeaning', defaultMessage: '<term>{total}</term> — {meaning}' },
              { term: (chunks) => <b>{chunks}</b>, total, meaning },
            )}
          </span>
        </span>
      }
    />
  )
}
