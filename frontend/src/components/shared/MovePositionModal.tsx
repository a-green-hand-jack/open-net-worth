import { useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import type { ComputedRow } from '../../types/portfolio'
import { authFetch } from '../../api/client'
import { Modal, FormField, Select, Stack, Button, Badge, ErrorState, Text } from '../ui'
import type { SelectOptGroup, SelectOption } from '../ui'
import { positionsMessage } from './positionsMessages'

// A non-archived account the position can be moved to. institution=null means no
// custodian was set (renders in the "Other" group in the Select).
export interface MoveableAccount {
  id: string
  name: string
  institution: string | null
  currency: string
}

interface Props {
  open: boolean
  onClose: () => void
  row: ComputedRow
  // All non-archived accounts excluding the position's current account.
  accounts: MoveableAccount[]
  onMoved: () => void
  allRows: ComputedRow[]
}

// ── Pure helpers (exported for unit tests) ─────────────────────────────────

/** Build optgroup options from a flat account list. Groups by institution; blank
 *  institution accounts fall into "Other". Groups sorted alphabetically; "Other"
 *  always last. Options within each group sorted by name. */
// eslint-disable-next-line react-refresh/only-export-components
export function buildDestinationOptions(
  accounts: MoveableAccount[],
  otherLabel = 'Other',
): SelectOptGroup[] {
  const groups = new Map<string, MoveableAccount[]>()
  for (const a of accounts) {
    const key = (a.institution || '').trim() || ''
    const bucket = groups.get(key) ?? []
    bucket.push(a)
    groups.set(key, bucket)
  }
  const other = groups.get('') ?? []
  groups.delete('')
  const sorted = [...groups.keys()].sort()
  const result: SelectOptGroup[] = sorted.map((g) => ({
    group: g,
    options: (groups.get(g) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` })),
  }))
  if (other.length) {
    result.push({
      group: otherLabel,
      options: other
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` })),
    })
  }
  return result
}

/** Build the preview line "from Vantage Brokerage (USD) → Vantage Brokerage (SGD)" for a chosen destination. */
// eslint-disable-next-line react-refresh/only-export-components
export function buildPreviewLine(row: ComputedRow, dest: MoveableAccount): string {
  const from = row.account_name || row.institution || row.category || '—'
  const fromCur = row.currency || ''
  const to = dest.name
  const toCur = dest.currency
  return `${from} (${fromCur}) → ${to} (${toCur})`
}

/** True when the row is the only position in its source account (determined by
 *  comparing all available rows against account_id). Because MovePositionModal
 *  receives only the current row, callers pass the full list for the check. */
// eslint-disable-next-line react-refresh/only-export-components
export function isLastPositionInAccount(row: ComputedRow, allRows: ComputedRow[]): boolean {
  if (!row.account_id) return false
  return allRows.filter((r) => r.account_id === row.account_id && r.position_id).length === 1
}

// ── Component ──────────────────────────────────────────────────────────────

type MoveState = 'idle' | 'busy' | 'error'

export function MovePositionModal({ open, onClose, row, accounts, onMoved, allRows }: Props) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const [destId, setDestId] = useState('')
  const [state, setState] = useState<MoveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reset destination when the modal opens for a new row.
  function handleClose() {
    setDestId('')
    setState('idle')
    setErrorMsg(null)
    onClose()
  }

  const optgroups: SelectOptGroup[] = buildDestinationOptions(
    accounts,
    formatMessage({ id: 'shared.move.other', defaultMessage: 'Other' }),
  )
  // Flatten to check if any destination exists.
  const hasDestinations = optgroups.some((g) => g.options.length > 0)

  // Find the chosen destination account for the preview.
  const destAccount = accounts.find((a) => a.id === destId) ?? null

  // Build the flat options list for the "no destinations" case.
  const noDestOption: SelectOption[] = [
    {
      value: '',
      label: formatMessage({
        id: 'shared.move.noAccounts',
        defaultMessage: 'No other accounts — add one in the Accounts tab first.',
      }),
      disabled: true,
    },
  ]

  const canMove = hasDestinations && !!destId && state !== 'busy'

  async function submit() {
    if (!destId || !row.position_id) return
    setState('busy')
    setErrorMsg(null)
    try {
      const res = await authFetch(`/api/positions/${row.position_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: { account_id: destId } }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(positionsMessage(body, `HTTP ${res.status}`, intl))
      }
      setState('idle')
      onMoved()
      handleClose()
    } catch (err) {
      setState('error')
      setErrorMsg(
        err instanceof Error
          ? err.message
          : formatMessage({ id: 'shared.move.unknown', defaultMessage: 'Unknown error' }),
      )
    }
  }

  const holdingName = `${row.quantity} ${row.symbol || row.label}`
  const fromLabel = `${row.account_name || row.institution || row.category || '—'} (${row.currency || ''})`
  const sourceAccountName = row.account_name || row.institution || row.category || '—'
  const isLastPos = isLastPositionInAccount(row, allRows)

  const footer = (
    <>
      <Button variant="secondary" onClick={handleClose} disabled={state === 'busy'}>
        {formatMessage({ id: 'shared.move.cancel', defaultMessage: 'Cancel' })}
      </Button>
      <Button variant="primary" onClick={submit} disabled={!canMove}>
        {state === 'busy'
          ? formatMessage({ id: 'shared.move.moving', defaultMessage: 'Moving…' })
          : formatMessage({ id: 'shared.move.title', defaultMessage: 'Move position' })}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={formatMessage({ id: 'shared.move.title', defaultMessage: 'Move position' })}
      size="sm"
      footer={footer}
    >
      <Stack gap="--space-5">
        <div>
          <Text size="base" weight={600}>
            {holdingName} {row.label && row.symbol ? row.label : ''}
          </Text>
          <Text size="sm" tone="muted">
            {formatMessage(
              { id: 'shared.move.from', defaultMessage: 'from {account}' },
              { account: fromLabel },
            )}
          </Text>
        </div>

        {state === 'error' && errorMsg && (
          <ErrorState
            message={
              errorMsg ??
              formatMessage({ id: 'shared.move.error', defaultMessage: 'Could not move position.' })
            }
            onRetry={submit}
          />
        )}

        <FormField
          label={formatMessage({
            id: 'shared.move.destination',
            defaultMessage: 'Destination account',
          })}
          htmlFor="move-pos-dest"
        >
          {hasDestinations ? (
            <Select
              id="move-pos-dest"
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              placeholder={formatMessage({
                id: 'shared.move.choose',
                defaultMessage: '— Choose account —',
              })}
              options={optgroups}
            />
          ) : (
            <Select
              id="move-pos-dest"
              value=""
              onChange={() => {}}
              options={noDestOption}
              disabled
            />
          )}
        </FormField>

        {destAccount && (
          <div className="move-pos-preview">
            <div className="move-pos-preview__name">
              {row.quantity} {row.symbol || row.label}
              {row.symbol && row.label ? ` • ${row.label}` : ''}
            </div>
            <div className="move-pos-preview__from">{buildPreviewLine(row, destAccount)}</div>
          </div>
        )}

        {isLastPos && (
          <Text size="xs" tone="muted">
            {formatMessage(
              {
                id: 'shared.move.lastPosition',
                defaultMessage:
                  'This is the only position in {account}. The account will remain open with a zero balance.',
              },
              { account: sourceAccountName },
            )}
          </Text>
        )}

        {row.vesting_state === 'unvested' && (
          <>
            <Badge tone="warn">
              {formatMessage({ id: 'shared.move.grantManaged', defaultMessage: 'Grant-managed' })}
            </Badge>
            <Text size="xs" tone="muted">
              {formatMessage({
                id: 'shared.move.grantWarning',
                defaultMessage:
                  'Grant-managed position — moving this holding may affect lot association. Verify tax treatment.',
              })}
            </Text>
          </>
        )}
      </Stack>
    </Modal>
  )
}
