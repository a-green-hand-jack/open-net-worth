// Settings → Permissions. Ported from
// design_handoffs/settings_handoff/prototype/redesign/settings-permissions.jsx, then updated
// for the 2026-08-14 permission-store merge (ADR
// `2026-08-14-one-permission-store-for-every-tool`): this list used to show only durable
// `tool_grants` rows (always "Always"). The shared API now returns every stored decision in
// the app, but this Settings surface deliberately shows only built-in (`core`) tools. Connector,
// web-search, and MCP decisions stay on their owning connector pages.
//
// Reads never ask; writes (and send_email) confirm every time until a tool is set to
// `always_allow` here or elsewhere. Revoking here resets a tool to its DEFAULT
// (`needs_approval`) — it is the only way to undo a decision (decisions survive a checkpoint
// restore).
import { useState } from 'react'
import type { IntlShape } from 'react-intl'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import {
  CORE_CONNECTOR_ID,
  YOLO_TOOL,
  clearToolPermission,
  listToolPermissions,
} from '../../../../api/toolPermissions'
import type { DecisionRow, DecisionsResponse } from '../../../../api/toolPermissions'
import { useCachedFetchState } from '../../../../state/queryCache'
import { fDate } from '../../../../utils/format'
import { Badge, Btn, Empty, Panel, useSectionBusy } from '../ds'
import type { BadgeTone, SectionProps } from '../ds'

/** Level → [badge text, badge tone]. The text is the real level — never a hardcoded
 *  "Always", which is what this row rendered before the merge when every row here really
 *  was a durable grant. It no longer is: a "Blocked" set under Connectors shows up here too. */
function levelMeta(level: string, intl: IntlShape): { label: string; tone: BadgeTone } {
  const { formatMessage } = intl
  switch (level) {
    case 'always_allow':
      return {
        label: formatMessage({
          id: 'settings.remaining.permissionAlways',
          defaultMessage: 'Always allow',
        }),
        tone: 'good',
      }
    case 'needs_approval':
      return {
        label: formatMessage({
          id: 'settings.remaining.legacyNeedsApproval',
          defaultMessage: 'Needs approval',
        }),
        tone: '',
      }
    case 'blocked':
      return {
        label: formatMessage({ id: 'settings.remaining.legacyBlocked', defaultMessage: 'Blocked' }),
        tone: 'bad',
      }
    default:
      return { label: level, tone: '' }
  }
}

function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s
}

/** A decision's OWNER, in words — `connector_id` is an opaque id (`core`, `plaid`,
 *  `mcp:firecrawl`, `web_search:tavily`), and a bare `sync_plaid_now` row with no context
 *  is a puzzle now that a Connectors-tab decision shows up here too. */
function ownerLabel(connectorId: string, intl: IntlShape): string {
  const { formatMessage } = intl
  if (connectorId === CORE_CONNECTOR_ID)
    return formatMessage({ id: 'settings.remaining.legacyBuiltIn', defaultMessage: 'Built-in' })
  if (connectorId.startsWith('mcp:')) return `MCP • ${connectorId.slice(4)}`
  if (connectorId.startsWith('web_search:'))
    return formatMessage(
      { id: 'settings.remaining.legacySearchOwner', defaultMessage: 'Web search • {name}' },
      { name: capitalize(connectorId.slice(11)) },
    )
  return capitalize(connectorId.replace(/_/g, ' '))
}

function PermissionRow({
  row,
  onReset,
}: {
  row: DecisionRow
  onReset: (row: DecisionRow) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const [armed, setArmed] = useState(false)
  const isYolo = row.tool === YOLO_TOOL
  const meta = levelMeta(row.level, intl)
  return (
    <div className="rd-permrow" role="row">
      <div className="rd-permrow-tool">
        {isYolo
          ? formatMessage({
              id: 'settings.remaining.legacyAllTools',
              defaultMessage: 'All tools (confirmation off)',
            })
          : row.tool}
        {/* A rename retired this tool — the decision is inert but still real, so it is
            RENDERED rather than filtered out: a permission the user set and can no longer
            see is the failure this list exists to fix. */}
        {!isYolo && !row.tool_exists && (
          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--faint)', marginTop: 2 }}>
            {formatMessage({
              id: 'settings.remaining.permUnavailable',
              defaultMessage: 'No longer available — renamed or removed',
            })}
          </div>
        )}
      </div>
      <span className="rd-permrow-owner">{ownerLabel(row.connector_id, intl)}</span>
      <span>
        {/* Yolo is always flagged `bad` regardless of its (always `always_allow`) level —
            it is the one decision that silences every confirmation in the app, which
            deserves the loud tone even though the level itself is the "safe" one. */}
        <Badge tone={isYolo ? 'bad' : meta.tone}>{meta.label}</Badge>
      </span>
      <span className="rd-permrow-when">{fDate(row.updated_at, 'short', 'always')}</span>
      <span>
        <Btn
          size="xs"
          variant={armed ? 'danger' : 'ghost'}
          onClick={() => {
            if (!armed) {
              setArmed(true)
              setTimeout(() => setArmed(false), 4000)
            } else {
              setArmed(false)
              onReset(row)
            }
          }}
          aria-label={formatMessage(
            {
              id: 'settings.remaining.permResetFor',
              defaultMessage: 'Reset {title} to the default',
            },
            {
              title: isYolo
                ? formatMessage({ id: 'settings.remaining.legacyAll', defaultMessage: 'all tools' })
                : row.tool,
            },
          )}
        >
          {armed
            ? formatMessage({
                id: 'settings.remaining.legacyConfirm',
                defaultMessage: 'Confirm reset?',
              })
            : formatMessage({ id: 'settings.remaining.permReset', defaultMessage: 'Reset' })}
        </Btn>
      </span>
    </div>
  )
}

export function PermissionsSection({ toast }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const { data, initialLoading, refresh } = useCachedFetchState<DecisionsResponse>(
    '/api/tool-permissions',
    listToolPermissions,
    { staleTime: 0 },
  )
  useSectionBusy(initialLoading && !data)

  const rows = (data?.permissions ?? []).filter((row) => row.connector_id === CORE_CONNECTOR_ID)

  const reset = async (row: DecisionRow) => {
    try {
      await clearToolPermission(row.tool, row.connector_id)
      void refresh()
      toast(
        formatMessage({
          id: 'settings.remaining.legacyResetDone',
          defaultMessage: 'Reset — takes effect on the next call',
        }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.permResetError',
          defaultMessage: 'Could not reset — try again',
        }),
      )
    }
  }

  return (
    <Panel
      title={
        <span>
          {formatMessage({
            id: 'settings.remaining.permTitle',
            defaultMessage: 'Tool permissions',
          })}{' '}
          {rows.length ? <Badge>{rows.length}</Badge> : null}
        </span>
      }
      sub={formatMessage({
        id: 'settings.remaining.legacySub',
        defaultMessage: 'What Lucius’s built-in tools can do without asking you first',
      })}
      actions={
        <Btn
          size="xs"
          variant="ghost"
          onClick={() => {
            void refresh()
            toast(
              formatMessage({
                id: 'settings.remaining.permRefreshed',
                defaultMessage: 'Refreshed',
              }),
            )
          }}
        >
          {formatMessage({ id: 'settings.remaining.permRefresh', defaultMessage: 'Refresh' })}
        </Btn>
      }
    >
      {rows.length ? (
        <>
          <div className="rd-permrow head" role="row">
            <span>
              {formatMessage({ id: 'settings.remaining.permTool', defaultMessage: 'Tool' })}
            </span>
            <span>
              {formatMessage({ id: 'settings.remaining.legacyOwner', defaultMessage: 'Owner' })}
            </span>
            <span>
              {formatMessage({ id: 'settings.remaining.legacyLevel', defaultMessage: 'Level' })}
            </span>
            <span>
              {formatMessage({ id: 'settings.remaining.legacyUpdated', defaultMessage: 'Updated' })}
            </span>
            <span></span>
          </div>
          {rows.map((r) => (
            <PermissionRow
              key={`${r.connector_id}:${r.tool}`}
              row={r}
              onReset={(row) => void reset(row)}
            />
          ))}
        </>
      ) : (
        <Empty
          title={formatMessage({
            id: 'settings.remaining.legacyEmpty',
            defaultMessage: 'No built-in permissions set yet',
          })}
          body={formatMessage({
            id: 'settings.remaining.legacyEmptyHelp',
            defaultMessage:
              'Built-in write tools ask first until you choose “Always allow” on a confirmation prompt. You can reset those decisions here.',
          })}
        />
      )}
    </Panel>
  )
}
