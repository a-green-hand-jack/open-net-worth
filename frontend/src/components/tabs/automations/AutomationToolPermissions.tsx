import { useAppIntl } from '../../../i18n/useAppIntl'
import { toolPermissionDescription, toolPermissionTitle } from '../../../i18n/toolDescriptions'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { Automation } from '../../../api/automations'
import {
  LEVEL_LABELS,
  TOOL_PERMISSIONS_KEY,
  listToolPermissions,
  ownerLabel,
} from '../../../api/toolPermissionsV2'
import type { PermissionLevel, ToolPermissionsResponse } from '../../../api/toolPermissionsV2'
import { useCachedFetchState } from '../../../state/queryCache'
import { Select } from '../../ui'
import {
  listedName,
  listedTitle,
  removeEntry,
  removeTool,
  setTool,
  toolRows,
} from './toolPermissions'
import type { AutomationToolValue, ToolLists } from './toolPermissions'

/** The most picker rows drawn at once — the catalogue is a few hundred tools, so narrow it by
 *  typing rather than render them all. */
const PICKER_LIMIT = 80

/** One Automation's own say over individual tools, on top of the global setting: **Always
 *  allow** a tool here (it never asks in this Automation) or **Block** it here (it is refused,
 *  and the run carries on without it). Everything not listed follows the tool's global value;
 *  a tool set to Ask is handled by this Automation's mode. The tool list is the same one
 *  Settings → Permissions shows. */
export function AutomationToolPermissions({
  automation,
  busy,
  modeLabel,
  onSave,
}: {
  automation: Automation
  busy: boolean
  modeLabel: string
  onSave: (lists: ToolLists) => void
}) {
  const intl = useAppIntl()
  const { formatMessage, locale } = intl
  const levelLabels: Record<PermissionLevel, string> = {
    always_allow: formatMessage({
      id: 'automations.permission.always',
      defaultMessage: 'Always allow',
    }),
    needs_approval: formatMessage({ id: 'automations.permission.ask', defaultMessage: 'Ask' }),
    blocked: formatMessage({ id: 'automations.permission.block', defaultMessage: 'Block' }),
  }
  const valueOptions = [
    { value: 'always_allow', label: levelLabels.always_allow },
    { value: 'blocked', label: levelLabels.blocked },
  ]
  const { data } = useCachedFetchState<ToolPermissionsResponse>(
    TOOL_PERMISSIONS_KEY,
    listToolPermissions,
    { staleTime: 0 },
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  const lists: ToolLists = {
    always_allowed: automation.always_allowed ?? [],
    blocked: automation.blocked ?? [],
  }
  const rows = toolRows(lists)
  const listed = new Set(rows.flatMap((row) => (row.tool ? [row.tool] : [])))
  const titleFor = (tool: string) => {
    const fallback = listedTitle(tool)
    const row = data?.permissions.find((item) => listedName(item) === tool)
    return row ? toolPermissionTitle(row, intl, fallback) : fallback
  }

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const needle = query.trim().toLowerCase()
  const candidates = (data?.permissions ?? []).filter(
    (row) =>
      row.tool_exists &&
      !listed.has(listedName(row)) &&
      (!needle ||
        [
          titleFor(listedName(row)),
          row.tool,
          toolPermissionDescription(row, locale),
          ownerLabel(row.connector_id),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle)),
  )
  const globalLabel = (tool: string) => {
    const level = data?.permissions.find((row) => listedName(row) === tool)?.level
    return level && level in LEVEL_LABELS ? levelLabels[level as PermissionLevel] : null
  }

  const choose = (tool: string, value: AutomationToolValue) => {
    onSave(setTool(lists, tool, value))
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      {rows.length > 0 && (
        <div
          className="a3-perm"
          role="table"
          aria-label={formatMessage({
            id: 'automations.permission.table',
            defaultMessage: 'Tool permissions in this Automation',
          })}
        >
          <div className="a3-perm-row head" role="row">
            <span>
              {formatMessage({ id: 'automations.permission.tool', defaultMessage: 'Tool' })}
            </span>
            <span className="a3-perm-head-value">
              {formatMessage({
                id: 'automations.permission.inAutomation',
                defaultMessage: 'In this Automation',
              })}
            </span>
          </div>
          {rows.map((row) => {
            const title = row.tool ? titleFor(row.tool) : row.label
            return (
              <div
                className="a3-perm-row"
                role="row"
                key={`${row.value}:${row.label}:${row.entryIndex ?? ''}`}
              >
                <span className="a3-perm-name" title={row.tool ?? undefined}>
                  {title}
                </span>
                {row.tool ? (
                  <span className="a3-perm-select">
                    <Select
                      dense
                      aria-label={formatMessage(
                        {
                          id: 'automations.permission.forTool',
                          defaultMessage: 'Permission for {title} in this Automation',
                        },
                        { title },
                      )}
                      value={row.value}
                      disabled={busy}
                      options={valueOptions}
                      onChange={(event) =>
                        onSave(setTool(lists, row.tool!, event.target.value as AutomationToolValue))
                      }
                    />
                    <ChevronDown size={13} className="a3-perm-select-chev" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="a3-perm-fixed">{levelLabels.always_allow}</span>
                )}
                <button
                  type="button"
                  className="a3-iconbtn danger"
                  aria-label={formatMessage(
                    { id: 'automations.permission.removeTool', defaultMessage: 'Remove {title}' },
                    { title },
                  )}
                  title={formatMessage({
                    id: 'automations.permission.remove',
                    defaultMessage: 'Remove',
                  })}
                  disabled={busy}
                  onClick={() =>
                    onSave(
                      row.tool
                        ? removeTool(lists, row.tool)
                        : removeEntry(lists, row.entryIndex ?? 0),
                    )
                  }
                >
                  <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <div className="a3-perm-add" ref={pickerRef}>
        <button
          type="button"
          className="a3-linkbtn"
          aria-expanded={open}
          disabled={busy}
          onClick={() => setOpen((on) => !on)}
        >
          <Plus size={12} aria-hidden="true" />{' '}
          {formatMessage({ id: 'automations.permission.add', defaultMessage: 'Add tool' })}
        </button>
        {open && (
          <div
            className="a3-perm-picker"
            role="dialog"
            aria-label={formatMessage({
              id: 'automations.permission.addDialog',
              defaultMessage: 'Add a tool',
            })}
          >
            <input
              type="search"
              autoFocus
              value={query}
              placeholder={formatMessage({
                id: 'automations.permission.searchPlaceholder',
                defaultMessage: 'Search every tool…',
              })}
              aria-label={formatMessage({
                id: 'automations.permission.search',
                defaultMessage: 'Search tools',
              })}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="a3-perm-list">
              {candidates.slice(0, PICKER_LIMIT).map((row) => (
                <div className="a3-perm-cand" key={`${row.connector_id}:${row.tool}`}>
                  <span className="a3-perm-cand-main">
                    <b title={listedName(row)}>{titleFor(listedName(row))}</b>
                    <span className="a3-perm-cand-sub">
                      {ownerLabel(row.connector_id)}
                      {globalLabel(listedName(row))
                        ? formatMessage(
                            {
                              id: 'automations.permission.globally',
                              defaultMessage: ' · Globally: {level}',
                            },
                            { level: globalLabel(listedName(row)) ?? '' },
                          )
                        : ''}
                      {row.description ? ` — ${toolPermissionDescription(row, locale)}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="a3-perm-pick"
                    aria-label={formatMessage(
                      {
                        id: 'automations.permission.allowTool',
                        defaultMessage: 'Always allow {title} in this Automation',
                      },
                      { title: titleFor(listedName(row)) },
                    )}
                    onClick={() => choose(listedName(row), 'always_allow')}
                  >
                    {levelLabels.always_allow}
                  </button>
                  <button
                    type="button"
                    className="a3-perm-pick danger"
                    aria-label={formatMessage(
                      {
                        id: 'automations.permission.blockTool',
                        defaultMessage: 'Block {title} in this Automation',
                      },
                      { title: titleFor(listedName(row)) },
                    )}
                    onClick={() => choose(listedName(row), 'blocked')}
                  >
                    {levelLabels.blocked}
                  </button>
                </div>
              ))}
              {candidates.length === 0 && (
                <div className="a3-block-note">
                  {data
                    ? formatMessage({
                        id: 'automations.permission.noMatches',
                        defaultMessage: 'No tool matches.',
                      })
                    : formatMessage({
                        id: 'automations.permission.loading',
                        defaultMessage: 'Loading tools…',
                      })}
                </div>
              )}
              {candidates.length > PICKER_LIMIT && (
                <div className="a3-block-note">
                  {formatMessage(
                    {
                      id: 'automations.permission.more',
                      defaultMessage: '{count} more — keep typing to narrow the list.',
                    },
                    { count: candidates.length - PICKER_LIMIT },
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="a3-block-note">
        {formatMessage(
          {
            id: 'automations.permission.else',
            defaultMessage: 'Everything else: global setting · {mode} mode',
          },
          { mode: modeLabel },
        )}
      </div>
    </>
  )
}
