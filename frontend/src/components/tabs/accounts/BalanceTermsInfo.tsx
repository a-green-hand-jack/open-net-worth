/**
 * BalanceTermsInfo.tsx — the one "i" beside a balance card's title. It explains all three figures
 * at once; an "i" under each 16px label was three hard-to-hit targets saying a line each
 * (owner, 2026-10-26).
 */

import { InfoPopover } from '../../ui'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function BalanceTermsInfo({ total, meaning }: { total: string; meaning: string }) {
  const { formatMessage: fm } = useAppIntl()
  return (
    <InfoPopover
      width={280}
      label={fm({
        id: 'accounts.overview.figuresMeaning',
        defaultMessage: 'What these figures mean',
      })}
      text={
        <span className="acct-bal-terms">
          <span>
            {fm(
              {
                id: 'accounts.overview.clearedMeaning',
                defaultMessage: "<b>Cleared</b> — posted; the amount won't change.",
              },
              { b: (chunks) => <b>{chunks}</b> },
            )}
          </span>
          <span>
            {fm(
              {
                id: 'accounts.overview.unclearedMeaning',
                defaultMessage: '<b>Uncleared</b> — pending holds that can still change.',
              },
              { b: (chunks) => <b>{chunks}</b> },
            )}
          </span>
          <span>
            <b>{total}</b> — {meaning}
          </span>
        </span>
      }
    />
  )
}
