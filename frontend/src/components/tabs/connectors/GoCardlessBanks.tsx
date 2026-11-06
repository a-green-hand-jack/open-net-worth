import { formatConnectorBody } from './connectorServerMessages'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
// The banks linked through the one GoCardless connector — each its own requisition, listed by
// name with its own Link again / Renew and Remove. Renewing a bank that still works keeps it
// fetching until the new consent is linked (server-side), so the old row stays until then.
import { useState } from 'react'
import { authFetch } from '../../../api/client'
import { emitDataChanged } from '../../../lucius/bus'
import { Button, ConfirmDialog, Text } from '../../ui'
import { fDate } from '../../../utils/format'
import { ENDED, type GoCardlessBank } from './gocardlessBank'

function bankLine(b: GoCardlessBank, intl: IntlShape): { text: string; warn: boolean } {
  const { formatMessage } = intl
  if (b.status === 'LN') {
    const until = b.consent_expires_at ? formatMessage({ id: 'connectors.gcBanks.until', defaultMessage: ' · access until {date}' }, { date: fDate(b.consent_expires_at) }) : ''
    return { text: formatMessage({ id: 'connectors.gcBanks.linked', defaultMessage: 'Linked · {count} {count, plural, one {account} other {accounts}}{until}' }, { count: b.accounts, until }), warn: false }
  }
  const ended = b.status === 'EX' ? formatMessage({ id: 'connectors.gcBanks.expired', defaultMessage: 'Access expired' }) : b.status === 'RJ' ? formatMessage({ id: 'connectors.gcBanks.refused', defaultMessage: 'The bank refused access' }) : b.status === 'SU' ? formatMessage({ id: 'connectors.gcBanks.suspended', defaultMessage: 'GoCardless suspended this link' }) : b.status === 'ER' ? formatMessage({ id: 'connectors.gcBanks.failed', defaultMessage: 'The bank link failed' }) : ''
  if (ended) return { text: formatMessage({ id: 'connectors.gcBanks.ended', defaultMessage: '{reason} — not syncing until you link it again' }, { reason: ended }), warn: true }
  return { text: b.renewing ? formatMessage({ id: 'connectors.gcBanks.renewing', defaultMessage: 'Renewal waiting for you to finish at the bank' }) : formatMessage({ id: 'connectors.gcBanks.waiting', defaultMessage: 'Waiting for you to finish at the bank' }), warn: true }
}

export function GoCardlessBanks({
  banks,
  onChanged,
}: {
  banks: GoCardlessBank[]
  /** A bank was renewed or left the list — re-read the status. */
  onChanged: () => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const [removing, setRemoving] = useState<GoCardlessBank | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function post(bank: GoCardlessBank, action: 'relink' | 'remove') {
    setBusy(bank.key)
    setError(null)
    const key = encodeURIComponent(bank.key)
    const url =
      action === 'relink'
        ? `/api/gocardless/banks/${key}/relink`
        : `/api/gocardless/banks/${key}/remove`
    try {
      const r = await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          action === 'relink' ? JSON.stringify({ redirect: window.location.origin }) : undefined,
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(
          formatConnectorBody(intl, d, (action === 'relink'
              ? formatMessage({ id: 'connectors.gocardless.linkError', defaultMessage: 'Could not start the bank link.' })
              : formatMessage({ id: 'connectors.plaidBanks.removeFailed', defaultMessage: 'Could not remove that bank.' }))),
        )
        return
      }
      if (action === 'relink' && d.link) window.open(d.link, '_blank', 'noopener,noreferrer')
      onChanged()
      emitDataChanged(['config'])
    } catch {
      setError(formatMessage({ id: 'connectors.mcp.unreachable', defaultMessage: 'Could not reach the server.' }))
    } finally {
      setBusy(null)
      setRemoving(null)
    }
  }

  const name = (b: GoCardlessBank) => b.institution_name || formatMessage({ id: 'connectors.plaidBanks.thisBank', defaultMessage: 'this bank' })

  return (
    <>
      <ul className="plaid-banks" aria-label={formatMessage({ id: 'connectors.plaidBanks.linkedBanks', defaultMessage: 'Linked banks' })}>
        {banks.map((b) => {
          const line = bankLine(b, intl)
          const ended = !!ENDED[b.status]
          return (
            <li key={b.key} className="plaid-bank">
              <div className="plaid-bank-main">
                <span className="plaid-bank-name">{b.institution_name || formatMessage({ id: 'connectors.gcBanks.linkedBank', defaultMessage: 'Linked bank' })}</span>
                <span
                  className={line.warn ? 'plaid-bank-sub plaid-bank-sub--warn' : 'plaid-bank-sub'}
                >
                  {line.text}
                </span>
              </div>
              {!b.renewing && (
                <Button
                  size="sm"
                  variant={ended ? 'primary' : 'secondary'}
                  loading={busy === b.key}
                  disabled={busy !== null}
                  aria-label={b.status === 'LN' ? formatMessage({ id: 'connectors.gcBanks.renewLabel', defaultMessage: 'Renew access to {name}' }, { name: name(b) }) : formatMessage({ id: 'connectors.gcBanks.againLabel', defaultMessage: 'Link again {name}' }, { name: name(b) })}
                  onClick={() => void post(b, 'relink')}
                >
                  {b.status === 'LN' ? formatMessage({ id: 'connectors.gcBanks.renew', defaultMessage: 'Renew' }) : formatMessage({ id: 'connectors.gcBanks.again', defaultMessage: 'Link again' })}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="plaid-bank-remove"
                disabled={busy !== null}
                aria-label={formatMessage({ id: 'connectors.plaidBanks.removeName', defaultMessage: 'Remove {name}' }, { name: name(b) })}
                onClick={() => setRemoving(b)}
              >
                {formatMessage({ id: 'connectors.action.remove', defaultMessage: 'Remove' })}
              </Button>
            </li>
          )
        })}
      </ul>
      {error && (
        <Text size="xs" tone="bad">
          {error}
        </Text>
      )}
      <ConfirmDialog
        data={
          removing && {
            title: formatMessage({ id: 'connectors.plaidBanks.removeTitle', defaultMessage: 'Remove {name}?' }, { name: name(removing) }),
            body: formatMessage({ id: 'connectors.gcBanks.removeBody', defaultMessage: 'Its access is revoked at GoCardless and its accounts stop syncing. Transactions already imported stay. Your other banks are not affected.' }),
            confirmLabel: formatMessage({ id: 'connectors.action.remove', defaultMessage: 'Remove' }),
            danger: true,
            confirmDisabled: busy !== null,
          }
        }
        onConfirm={() => removing && void post(removing, 'remove')}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}
