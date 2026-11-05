import { useAppIntl } from '../../../i18n/useAppIntl'
// Accounts created from a bank that had no name yet were filed under the provider ("Plaid")
// instead of the bank, so the Accounts sidebar never grouped them. Once the bank has a name,
// this offers — one click, the user's call, never silently — to file those accounts under it,
// through the ordinary account edit (PUT /api/accounts/{id}). An institution the user set
// themselves (anything but the placeholder or blank) is never touched.
import { useState } from 'react'
import { authFetch } from '../../../api/client'
import { Button, Text } from '../../ui'
import { misfiled, type MisfileAccount, type ProviderAccountRow } from './accountRows'

export function FileUnderBankFix({
  rows,
  accounts,
  providerLabel,
  onFixed,
}: {
  rows: ProviderAccountRow[]
  accounts: MisfileAccount[]
  providerLabel: string
  onFixed: () => void
}) {
  const { formatMessage } = useAppIntl()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const groups = [...misfiled(rows, accounts, providerLabel)]
  if (groups.length === 0) return null

  async function fileUnder(bank: string, list: MisfileAccount[]) {
    setBusy(bank)
    setError(null)
    try {
      for (const acct of list) {
        const r = await authFetch(`/api/accounts/${acct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ institution: bank }),
        })
        if (!r.ok) {
          setError(formatMessage({ id: 'connectors.bankFix.failed', defaultMessage: 'Could not update {name} — try again.' }, { name: acct.name }))
          return
        }
      }
      onFixed()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="conn-file-fix" role="region" aria-label={formatMessage({ id: 'connectors.bankFix.region', defaultMessage: 'Accounts filed under the wrong bank' })}>
      {groups.map(([bank, list]) => (
        <div key={bank} className="conn-file-fix-row">
          <Text size="xs" tone="muted">
            {list.length === 1
              ? formatMessage({ id: 'connectors.bankFix.single', defaultMessage: '“{name}” is filed under {provider} instead of {bank}.' }, { name: list[0]!.name, provider: providerLabel, bank })
              : formatMessage({ id: 'connectors.bankFix.multiple', defaultMessage: '{count} accounts are filed under {provider} instead of {bank}.' }, { count: list.length, provider: providerLabel, bank })}
          </Text>
          <Button size="sm" loading={busy === bank} onClick={() => void fileUnder(bank, list)}>
            {formatMessage({ id: 'connectors.bankFix.file', defaultMessage: 'File {count, plural, one {it} other {them}} under {bank}' }, { count: list.length, bank })}
          </Button>
        </div>
      ))}
      {error && (
        <Text size="xs" tone="bad">
          {error}
        </Text>
      )}
    </div>
  )
}
