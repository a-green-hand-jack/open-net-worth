import { formatConnectorBody } from './connectorServerMessages'
import { useAppIntl } from '../../../i18n/useAppIntl'
// Step ② of Plaid setup — the banks linked through this one Plaid connector. Each bank is its
// own Plaid Item: listed by name with its own Remove, and "Link another bank" adds one more
// (re-linking the same bank replaces its entry server-side). Link bank saves unsaved keys first
// (the caller's `onLink`).
import { useState } from 'react'
import { authFetch } from '../../../api/client'
import { emitDataChanged } from '../../../lucius/bus'
import { Button, Cluster, ConfirmDialog, Stack, Text, TextField } from '../../ui'
import { fDate } from '../../../utils/format'
import { SetupStep, type SetupStepState } from './SetupStep'
import type { PlaidLink } from './usePlaidLink'

export interface PlaidBank {
  key: string
  /** The name shown: the user's own if they renamed it, else Plaid's. */
  institution_name: string
  /** Plaid's own name for the bank — shown beside a name the user chose. */
  provider_name?: string
  renamed?: boolean
  linked_at: string | null
  /** Plaid says this bank's sign-in must be renewed — offer Reconnect (update mode). */
  needs_reconnect?: boolean
}

export function PlaidBanksStep({
  banks,
  caution,
  state,
  link,
  keysEntered,
  saving,
  onLink,
  onChanged,
}: {
  banks: PlaidBank[]
  /** The last fetch failed for some banks (an expired login, say) — shown so it isn't silent. */
  caution?: string | null
  state: SetupStepState
  link: PlaidLink
  keysEntered: boolean
  saving: boolean
  onLink: () => void
  /** A bank left the list — re-read the status. */
  onChanged: () => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  // Renew one linked bank in place (Plaid update mode) — same accounts, so every link survives.
  const renew = (b: PlaidBank, addAccounts: boolean) =>
    void link.start({ bank: b.key, addAccounts })
  const [removing, setRemoving] = useState<PlaidBank | null>(null)
  const [renaming, setRenaming] = useState<{ key: string; draft: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const any = banks.length > 0

  async function saveName(bank: PlaidBank, name: string) {
    setBusy(true)
    setError(null)
    try {
      const r = await authFetch(`/api/plaid/banks/${encodeURIComponent(bank.key)}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(
          formatConnectorBody(
            intl,
            d,
            formatMessage({
              id: 'connectors.plaidBanks.renameFailed',
              defaultMessage: 'Could not rename that bank.',
            }),
          ),
        )
        return
      }
      setRenaming(null)
      onChanged()
      emitDataChanged(['config'])
    } finally {
      setBusy(false)
    }
  }

  async function remove(bank: PlaidBank) {
    setBusy(true)
    setError(null)
    try {
      const r = await authFetch(`/api/plaid/banks/${encodeURIComponent(bank.key)}/remove`, {
        method: 'POST',
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(
          formatConnectorBody(
            intl,
            d,
            formatMessage({
              id: 'connectors.plaidBanks.removeFailed',
              defaultMessage: 'Could not remove that bank.',
            }),
          ),
        )
        return
      }
      onChanged()
      emitDataChanged(['config'])
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  return (
    <SetupStep
      n={2}
      title={
        any
          ? formatMessage({
              id: 'connectors.plaidBanks.linkBanks',
              defaultMessage: 'Link your banks',
            })
          : formatMessage({
              id: 'connectors.plaidBanks.linkBank',
              defaultMessage: 'Link your bank',
            })
      }
      state={state}
    >
      <Stack gap="--space-3">
        {any && (
          <ul
            className="plaid-banks"
            aria-label={formatMessage({
              id: 'connectors.plaidBanks.linkedBanks',
              defaultMessage: 'Linked banks',
            })}
          >
            {banks.map((b) => (
              <li key={b.key} className="plaid-bank">
                <div className="plaid-bank-main">
                  {renaming?.key === b.key ? (
                    <form
                      className="plaid-bank-rename"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void saveName(b, renaming.draft)
                      }}
                    >
                      <TextField
                        aria-label={formatMessage(
                          {
                            id: 'connectors.plaidBanks.nameFor',
                            defaultMessage: 'Name for {name}',
                          },
                          {
                            name:
                              b.provider_name ||
                              b.institution_name ||
                              formatMessage({
                                id: 'connectors.plaidBanks.thisBank',
                                defaultMessage: 'this bank',
                              }),
                          },
                        )}
                        value={renaming.draft}
                        placeholder={
                          b.provider_name ||
                          formatMessage({
                            id: 'connectors.plaidBanks.bankName',
                            defaultMessage: 'Bank name',
                          })
                        }
                        autoFocus
                        maxLength={80}
                        onChange={(e) => setRenaming({ key: b.key, draft: e.target.value })}
                        onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        type="submit"
                        loading={busy}
                        aria-label={formatMessage({
                          id: 'connectors.plaidBanks.saveName',
                          defaultMessage: 'Save name',
                        })}
                      >
                        {formatMessage({ id: 'connectors.action.save', defaultMessage: 'Save' })}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                        {formatMessage({
                          id: 'connectors.action.cancel',
                          defaultMessage: 'Cancel',
                        })}
                      </Button>
                    </form>
                  ) : (
                    <span className="plaid-bank-name">
                      {b.institution_name ||
                        formatMessage({
                          id: 'connectors.plaidBanks.unnamed',
                          defaultMessage: 'Unnamed bank',
                        })}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="plaid-bank-rename-btn"
                        aria-label={formatMessage(
                          {
                            id: 'connectors.plaidBanks.renameName',
                            defaultMessage: 'Rename {name}',
                          },
                          {
                            name:
                              b.institution_name ||
                              formatMessage({
                                id: 'connectors.plaidBanks.thisBank',
                                defaultMessage: 'this bank',
                              }),
                          },
                        )}
                        onClick={() => setRenaming({ key: b.key, draft: b.institution_name || '' })}
                      >
                        {formatMessage({
                          id: 'connectors.plaidBanks.rename',
                          defaultMessage: 'Rename',
                        })}
                      </Button>
                    </span>
                  )}
                  {b.renamed && b.provider_name && renaming?.key !== b.key && (
                    <span className="plaid-bank-sub">
                      {formatMessage(
                        {
                          id: 'connectors.plaidBanks.providerName',
                          defaultMessage: 'Plaid calls it {name}',
                        },
                        { name: b.provider_name },
                      )}
                    </span>
                  )}
                  {b.needs_reconnect ? (
                    <span className="plaid-bank-sub plaid-bank-sub--warn">
                      {formatMessage({
                        id: 'connectors.plaidBanks.expired',
                        defaultMessage: 'Sign-in expired — nothing syncs until you reconnect',
                      })}
                    </span>
                  ) : (
                    b.linked_at && (
                      <span className="plaid-bank-sub">
                        {formatMessage(
                          { id: 'connectors.plaidBanks.linkedAt', defaultMessage: 'Linked {date}' },
                          { date: fDate(b.linked_at, 'short') },
                        )}
                      </span>
                    )
                  )}
                </div>
                {b.needs_reconnect ? (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={link.waiting || link.starting}
                    onClick={() => renew(b, false)}
                  >
                    {formatMessage({ id: 'connectors.reconnect', defaultMessage: 'Reconnect' })}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={link.waiting || link.starting}
                    aria-label={formatMessage(
                      {
                        id: 'connectors.plaidBanks.addAccountsAt',
                        defaultMessage: 'Add accounts at {name}',
                      },
                      {
                        name:
                          b.institution_name ||
                          formatMessage({
                            id: 'connectors.plaidBanks.thisBank',
                            defaultMessage: 'this bank',
                          }),
                      },
                    )}
                    onClick={() => renew(b, true)}
                  >
                    {formatMessage({
                      id: 'connectors.plaidBanks.addAccounts',
                      defaultMessage: 'Add accounts',
                    })}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="plaid-bank-remove"
                  aria-label={formatMessage(
                    { id: 'connectors.plaidBanks.removeName', defaultMessage: 'Remove {name}' },
                    {
                      name:
                        b.institution_name ||
                        formatMessage({
                          id: 'connectors.plaidBanks.thisBank',
                          defaultMessage: 'this bank',
                        }),
                    },
                  )}
                  onClick={() => setRemoving(b)}
                >
                  {formatMessage({ id: 'connectors.action.remove', defaultMessage: 'Remove' })}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {caution && (
          <Text size="xs" tone="warn">
            {formatMessage(
              {
                id: 'connectors.plaidBanks.caution',
                defaultMessage:
                  "Last fetch couldn't reach every bank — {caution}. If a bank's sign-in expired, link it again.",
              },
              { caution },
            )}
          </Text>
        )}

        {link.waiting ? (
          <Cluster gap="--space-3" align="center" wrap>
            <Text size="xs" tone="muted">
              {formatMessage({
                id: 'connectors.plaidBanks.waiting',
                defaultMessage:
                  'Waiting for you to finish at Plaid… this page finishes on its own.',
              })}
            </Text>
            <Button size="sm" variant="secondary" loading={link.checking} onClick={link.checkNow}>
              {formatMessage({ id: 'connectors.plaidBanks.checkNow', defaultMessage: 'Check now' })}
            </Button>
          </Cluster>
        ) : (
          <>
            {!any && (
              <Text size="xs" tone="muted">
                {formatMessage({
                  id: 'connectors.plaidBanks.signIn',
                  defaultMessage:
                    'Sign in at your bank in your browser. When Plaid says you can close the window, come back — this page finishes the link on its own.',
                })}
              </Text>
            )}
            {link.justLinked && (
              <Text size="xs" tone="good">
                {!link.renewed
                  ? formatMessage({
                      id: 'connectors.plaidBanks.linked',
                      defaultMessage: 'Bank linked. Choose its accounts below.',
                    })
                  : link.renewedKind === 'accounts'
                    ? formatMessage(
                        {
                          id: 'connectors.plaidBanks.updated',
                          defaultMessage:
                            '{name} updated — any accounts you added are listed below; existing links are unchanged.',
                        },
                        { name: link.renewed },
                      )
                    : formatMessage(
                        {
                          id: 'connectors.plaidBanks.reconnected',
                          defaultMessage:
                            '{name} reconnected — its accounts and links are unchanged.',
                        },
                        { name: link.renewed },
                      )}
              </Text>
            )}
            <Cluster gap="--space-3" align="center" wrap>
              <Button
                size="sm"
                variant={any ? 'secondary' : 'primary'}
                loading={link.starting || saving}
                disabled={!keysEntered}
                onClick={onLink}
              >
                {any
                  ? formatMessage({
                      id: 'connectors.plaidBanks.another',
                      defaultMessage: 'Link another bank',
                    })
                  : formatMessage({
                      id: 'connectors.plaidBanks.link',
                      defaultMessage: 'Link bank',
                    })}
              </Button>
              {!keysEntered && (
                <Text size="xs" tone="faint">
                  {formatMessage({
                    id: 'connectors.plaidBanks.enterKeys',
                    defaultMessage: 'Enter your Client ID and Secret first.',
                  })}
                </Text>
              )}
            </Cluster>
          </>
        )}
        {(link.error || error) && (
          <Text size="xs" tone="bad">
            {link.error || error}
          </Text>
        )}
      </Stack>

      <ConfirmDialog
        data={
          removing && {
            title: formatMessage(
              { id: 'connectors.plaidBanks.removeTitle', defaultMessage: 'Remove {name}?' },
              {
                name:
                  removing.institution_name ||
                  formatMessage({
                    id: 'connectors.plaidBanks.thisBank',
                    defaultMessage: 'this bank',
                  }),
              },
            ),
            body: formatMessage({
              id: 'connectors.plaidBanks.removeBody',
              defaultMessage:
                'Its accounts stop syncing and leave the list. Transactions already imported stay. Your other banks are not affected.',
            }),
            confirmLabel: formatMessage({
              id: 'connectors.action.remove',
              defaultMessage: 'Remove',
            }),
            danger: true,
            confirmDisabled: busy,
          }
        }
        onConfirm={() => removing && void remove(removing)}
        onCancel={() => setRemoving(null)}
      />
    </SetupStep>
  )
}
