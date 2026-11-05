import { useAppIntl } from '../../../i18n/useAppIntl'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '../../../api/client'
import { Stack, Cluster, Text, Button, FormField, Select } from '../../ui'

// Shared chat-pairing UI: the access-policy <Select> (WHO may reach Lucius) + a Pending-approvals
// list, used by every chat connector section (today: Telegram) so a future channel shares ONE
// pairing surface — no per-channel fork. This setting decides who gets through; what they can
// then do is the tool-permission question, decided separately.

// 'open'/'disabled' are still real backend states (see access_policy.py) — 'disabled' in
// particular is a hardcoded internal backstop Pause/Remove force regardless of what's stored —
// but neither is offered as a PICK here (owner review, 2026-08-22): 'open' is a foot-gun sitting
// next to safe defaults ("anyone on the internet gets your finances"), and 'disabled' is nearly
// redundant with pausing the whole connector. A legacy stored value of either still behaves as
// specified; a user just can't newly opt into them from this dropdown.
export type AccessPolicy = 'pairing' | 'allowlist' | 'open' | 'disabled'

export function AccessPolicyField({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: AccessPolicy
  onChange: (v: AccessPolicy) => void
}) {
  const { formatMessage } = useAppIntl()
  const help = value === 'pairing' ? formatMessage({ id: 'connectors.chat.pairingHelp', defaultMessage: 'Save, then message your bot and approve the request that appears below.' }) : value === 'allowlist' ? formatMessage({ id: 'connectors.chat.allowlistHelp', defaultMessage: 'Only the senders listed below can reach Lucius.' }) : value === 'open' ? formatMessage({ id: 'connectors.chat.openHelp', defaultMessage: 'Anyone who can reach the bot can talk to Lucius and read your finances. Only use this while testing.' }) : formatMessage({ id: 'connectors.chat.disabledHelp', defaultMessage: 'Every incoming message is ignored. The bot stays connected but never answers.' })
  return (
    <FormField label={formatMessage({ id: 'connectors.chat.who', defaultMessage: 'Who can chat' })} htmlFor={`${idPrefix}-policy`} help={help}>
      <Select
        id={`${idPrefix}-policy`}
        value={value}
        options={[{ value: 'pairing', label: formatMessage({ id: 'connectors.chat.pairing', defaultMessage: 'Pairing — new senders ask for approval' }) }, { value: 'allowlist', label: formatMessage({ id: 'connectors.chat.allowlist', defaultMessage: 'Allowlist — only the IDs you list' }) }]}
        onChange={(e) => onChange(e.target.value as AccessPolicy)}
      />
    </FormField>
  )
}

interface PendingRow {
  connector: string
  sender_id: string
  code: string
  requested_at: string
  sender_label?: string
}

const POLL_MS = 4000

// Pending-approvals list for ONE connector. Polls /api/chat-pairing every few seconds WHILE
// this modal is open, so a request that lands after you opened it still shows up without
// closing and reopening — plus an immediate refresh after Approve/Reject. `active` gates the
// poll entirely: only "pairing" mode ever produces pending rows, so polling under any other
// policy (e.g. Allowlist) would just be a wasted request every few seconds forever.
// `onApproved` lets the parent reload its config (the allowlist changed).
export function PendingApprovals({
  connector,
  active,
  onApproved,
}: {
  connector: string
  active: boolean
  onApproved?: () => void
}) {
  const { formatMessage } = useAppIntl()
  const [rows, setRows] = useState<PendingRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    authFetch(`/api/chat-pairing?connector=${encodeURIComponent(connector)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { requests: PendingRow[] }) => setRows(d.requests || []))
      .catch(() => setRows([]))
  }, [connector])

  useEffect(() => {
    if (!active) {
      setRows([])
      return
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [active, load])

  async function act(senderId: string, action: 'approve' | 'reject') {
    setBusy(senderId)
    try {
      const r = await authFetch(`/api/chat-pairing/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector, sender_id: senderId }),
      })
      if (r.ok) {
        load()
        if (action === 'approve') onApproved?.()
      }
    } catch {
      /* best-effort — leave the row, the operator can retry */
    } finally {
      setBusy(null)
    }
  }

  if (rows.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
      }}
    >
      <Stack gap="--space-2">
        <Text size="sm" weight={600}>
          {formatMessage({ id: 'connectors.chat.pending', defaultMessage: 'Pending approvals ({count})' }, { count: rows.length })}
        </Text>
        <Text size="xs" tone="faint">
          {formatMessage({ id: 'connectors.chat.pendingHelp', defaultMessage: "These senders messaged the bot but aren't approved yet. Approve one and their next message reaches Lucius; reject to clear the request." })}
        </Text>
        <Stack gap="--space-2">
          {rows.map((row) => (
            <Cluster key={row.sender_id} gap="--space-3" align="center" justify="between">
              <Text size="sm">
                <code>{row.sender_label || row.sender_id}</code> • {formatMessage({ id: 'connectors.chat.code', defaultMessage: 'code' })} <code>{row.code}</code>
              </Text>
              <Cluster gap="--space-2" align="center">
                <Button
                  size="sm"
                  variant="primary"
                  style={{ padding: '4px 10px' }}
                  loading={busy === row.sender_id}
                  onClick={() => act(row.sender_id, 'approve')}
                >
                  {formatMessage({ id: 'connectors.chat.approve', defaultMessage: 'Approve' })}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  style={{ padding: '4px 10px' }}
                  disabled={busy === row.sender_id}
                  onClick={() => act(row.sender_id, 'reject')}
                >
                  {formatMessage({ id: 'connectors.chat.reject', defaultMessage: 'Reject' })}
                </Button>
              </Cluster>
            </Cluster>
          ))}
        </Stack>
      </Stack>
    </div>
  )
}
