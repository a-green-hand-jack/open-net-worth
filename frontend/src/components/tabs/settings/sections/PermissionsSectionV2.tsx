// Settings → Permissions: every BUILT-IN tool, one value each — Always allow, Ask or Block (ADR
// `2026-10-11-permissions-are-one-value-per-tool`). Ported from
// design_handoffs/settings_handoff/prototype/redesign/settings-permissions.jsx, then reshaped:
// the list used to show only the decisions the owner had made; now every tool has a row (it is
// seeded with a sensible default — a read runs, a change or a send asks), so the list is the
// whole built-in catalogue, searchable. A connector's or an MCP server's tools are set on that
// connector's own page in the Connectors tab, not here.
//
// The mode (manual / auto / skip) only decides what Ask means. Reset puts a tool back to its
// default and is offered only when the value differs from it.
import { useState } from 'react'
import type { IntlShape } from 'react-intl'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { toolPermissionDescription, toolPermissionTitle } from '../../../../i18n/toolDescriptions'
import {
  LEVEL_LABELS,
  LEVEL_ORDER,
  TOOL_PERMISSIONS_KEY,
  listToolPermissions,
  resetToolPermission,
  setToolPermission,
  toolTitle,
} from '../../../../api/toolPermissionsV2'
import type {
  PermissionLevel,
  ToolPermission,
  ToolPermissionsResponse,
} from '../../../../api/toolPermissionsV2'
import { useCachedFetchState } from '../../../../state/queryCache'
import { Badge, Btn, Empty, Panel, Select, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'

function levelLabel(intl: IntlShape, level: PermissionLevel): string {
  const { formatMessage } = intl
  switch (level) {
    case 'always_allow':
      return formatMessage({ id: 'settings.remaining.permAlways', defaultMessage: 'Always allow' })
    case 'needs_approval':
      return formatMessage({ id: 'settings.remaining.permAsk', defaultMessage: 'Ask' })
    case 'blocked':
      return formatMessage({ id: 'settings.remaining.permBlock', defaultMessage: 'Block' })
  }
}

function isLevel(level: string): level is PermissionLevel {
  return level in LEVEL_LABELS
}

/** True when the owner has moved this tool off its default — or its tool is gone, which Reset
 *  also clears. */
function isChanged(row: ToolPermission): boolean {
  return !row.tool_exists || row.level !== row.default_level
}

function matches(row: ToolPermission, needle: string, intl: IntlShape): boolean {
  if (!needle) return true
  return [
    toolTitle(row.tool),
    toolPermissionTitle(row, intl, toolTitle(row.tool)),
    row.tool,
    row.description,
    toolPermissionDescription(row, intl.locale),
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

function PermissionRow({
  row,
  onReset,
  onChange,
}: {
  row: ToolPermission
  onReset: (row: ToolPermission) => void
  onChange: (row: ToolPermission, level: PermissionLevel) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const title = toolPermissionTitle(row, intl, toolTitle(row.tool))
  const editable = row.tool_exists && isLevel(row.level)
  return (
    <div className="rd-permrow-v2" role="row">
      <div className="rd-permrow-tool-v2" title={row.tool}>
        {title}
        {row.description && row.tool_exists ? (
          <div className="rd-permrow-desc">{toolPermissionDescription(row, intl.locale)}</div>
        ) : null}
        {/* A rename retired this tool — the decision is inert but still real, so it is
            RENDERED rather than filtered out: a permission the user set and can no longer
            see is the failure this list exists to fix. */}
        {!row.tool_exists && (
          <div className="rd-permrow-desc">
            {formatMessage({
              id: 'settings.remaining.permUnavailable',
              defaultMessage: 'No longer available — renamed or removed',
            })}
          </div>
        )}
      </div>
      <span>
        {editable ? (
          <Select
            aria-label={formatMessage(
              { id: 'settings.remaining.permFor', defaultMessage: 'Permission for {title}' },
              { title },
            )}
            value={row.level}
            onChange={(e) => onChange(row, e.target.value as PermissionLevel)}
          >
            {LEVEL_ORDER.map((level) => (
              <option key={level} value={level}>
                {levelLabel(intl, level)}
              </option>
            ))}
          </Select>
        ) : (
          <Badge>{isLevel(row.level) ? levelLabel(intl, row.level) : row.level}</Badge>
        )}
      </span>
      <span>
        {isChanged(row) ? (
          <Btn
            size="xs"
            variant="ghost"
            onClick={() => onReset(row)}
            aria-label={formatMessage(
              {
                id: 'settings.remaining.permResetFor',
                defaultMessage: 'Reset {title} to the default',
              },
              { title },
            )}
          >
            {formatMessage({ id: 'settings.remaining.permReset', defaultMessage: 'Reset' })}
          </Btn>
        ) : (
          <span className="rd-permrow-default">
            {formatMessage({ id: 'settings.remaining.permDefault', defaultMessage: 'Default' })}
          </span>
        )}
      </span>
    </div>
  )
}

export function PermissionsSectionV2({ toast }: SectionProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const { data, initialLoading, refresh } = useCachedFetchState<ToolPermissionsResponse>(
    TOOL_PERMISSIONS_KEY,
    listToolPermissions,
    { staleTime: 0 },
  )
  useSectionBusy(initialLoading && !data)
  const [query, setQuery] = useState('')
  const [changedOnly, setChangedOnly] = useState(false)

  // Built-in tools only — a connector's and an MCP server's tools live on their Connectors page.
  const all = (data?.permissions ?? []).filter((row) => row.connector_id === 'core')
  const changedCount = all.filter(isChanged).length
  const needle = query.trim().toLowerCase()
  const shown = all.filter((row) => matches(row, needle, intl) && (!changedOnly || isChanged(row)))

  const reset = async (row: ToolPermission) => {
    try {
      const { level } = await resetToolPermission(row.tool, row.connector_id)
      void refresh()
      toast(
        level && isLevel(level)
          ? `${toolTitle(row.tool)}: back to ${levelLabel(intl, level)} — takes effect on the next call`
          : formatMessage(
              { id: 'settings.remaining.permRemoved', defaultMessage: '{title}: removed' },
              { title: toolPermissionTitle(row, intl, toolTitle(row.tool)) },
            ),
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

  const change = async (row: ToolPermission, level: PermissionLevel) => {
    try {
      await setToolPermission({ tool: row.tool, level, connector_id: row.connector_id })
      void refresh()
      toast(`${toolTitle(row.tool)}: ${levelLabel(intl, level)} — takes effect on the next call`)
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.permChangeError',
          defaultMessage: 'Could not change that — try again',
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
          {all.length ? <Badge>{all.length}</Badge> : null}
        </span>
      }
      sub={formatMessage({
        id: 'settings.remaining.permSub',
        defaultMessage:
          "Lucius's built-in tools, and whether each runs, asks you first, or is blocked. In Auto mode a tool set to Ask is judged by the Auto judge; in Skip mode it runs. A connector's tools are set on its page in Connectors.",
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
      <div className="rd-permtoolbar">
        <input
          className="rd-input"
          type="search"
          value={query}
          placeholder={formatMessage({
            id: 'settings.remaining.permSearchPlaceholder',
            defaultMessage: 'Search tools…',
          })}
          aria-label={formatMessage({
            id: 'settings.remaining.permSearch',
            defaultMessage: 'Search tools',
          })}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Btn
          size="xs"
          variant={changedOnly ? 'primary' : 'ghost'}
          aria-pressed={changedOnly}
          onClick={() => setChangedOnly((on) => !on)}
        >
          {changedOnly
            ? formatMessage({
                id: 'settings.remaining.permShowing',
                defaultMessage: 'Showing changed',
              })
            : formatMessage(
                { id: 'settings.remaining.permCount', defaultMessage: 'Changed ({count})' },
                { count: changedCount },
              )}
        </Btn>
      </div>
      {shown.length ? (
        <>
          <div className="rd-permrow-v2 head" role="row">
            <span>
              {formatMessage({ id: 'settings.remaining.permTool', defaultMessage: 'Tool' })}
            </span>
            <span>
              {formatMessage({ id: 'settings.remaining.permValue', defaultMessage: 'Value' })}
            </span>
            <span></span>
          </div>
          {shown.map((r) => (
            <PermissionRow
              key={r.tool}
              row={r}
              onReset={(row) => void reset(row)}
              onChange={(row, level) => void change(row, level)}
            />
          ))}
        </>
      ) : (
        <Empty
          title={
            initialLoading
              ? formatMessage({
                  id: 'settings.remaining.permLoading',
                  defaultMessage: 'Loading tools…',
                })
              : formatMessage({
                  id: 'settings.remaining.permNoMatches',
                  defaultMessage: 'No tools match',
                })
          }
          body={
            initialLoading
              ? undefined
              : changedOnly && !query
                ? formatMessage({
                    id: 'settings.remaining.permNoneChanged',
                    defaultMessage: 'Nothing has been changed from its default.',
                  })
                : formatMessage({
                    id: 'settings.remaining.permSearchHelp',
                    defaultMessage: 'Try another word — you can search by name or what it does.',
                  })
          }
        />
      )}
    </Panel>
  )
}
