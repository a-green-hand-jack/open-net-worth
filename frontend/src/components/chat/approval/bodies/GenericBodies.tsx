import { useAppIntl } from '../../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { displayValue, fieldLabel, fieldPathLabel } from '../FieldLabels'
import { FormattedMessage } from '../FormattedMessage'
import { useMemo, useState, type ReactElement } from 'react'
import { diffLines, diffWords } from 'diff'
import type {
  AutomationFieldChange,
  AutomationUpdateDisplay,
  ProposedChange,
  ToolPreview,
} from '../../../../types/chat'
import {
  ApprovalChange,
  ApprovalCode,
  ApprovalDetails,
  ApprovalDiff,
  ApprovalDiffLine,
  ApprovalDiffWord,
  ApprovalFact,
  ApprovalFacts,
  ApprovalMeta,
  ApprovalNote,
  ApprovalSection,
  ApprovalTable,
  ApprovalToggle,
  type DiffKind,
} from '../ApprovalCard'
import {
  isRecord,
  permissionArguments,
  permissionTextEdits,
  previewHasNoChanges,
  withNamesInPlace,
} from '../cardTypes'
import { BatchCell } from './BatchBody'
import { fBase } from '../../../../utils/format'

type Entry = [string, unknown]

// A value this short reads as a fact row; anything longer folds behind a disclosure.
const INLINE_MAX = 80
const TEXT_INLINE_MAX = 160

const isScalar = (v: unknown) => v == null || ['string', 'number', 'boolean'].includes(typeof v)

/** A value as one line of plain words: lists joined, an object as "key: value" pairs. */

/** The value as a fact row's text, or null when it is too big for one row. */
function inlineText(v: unknown, intl: IntlShape, tool?: string, version?: string, path?: string): string | null {
  const flat =
    isScalar(v) ||
    (Array.isArray(v) && v.every(isScalar)) ||
    (isRecord(v) && Object.keys(v).length <= 3 && Object.values(v).every(isScalar))
  if (!flat) return null
  const text = displayValue(v, intl, tool, version, path)
  const max = isScalar(v) ? TEXT_INLINE_MAX : INLINE_MAX
  return text.length <= max && !text.includes('\n') ? text : null
}

function foldSummary(key: string, v: unknown, intl: IntlShape, tool?: string, version?: string): string {
  const [n, unit] =
    typeof v === 'string'
      ? [v.length, 'character']
      : Array.isArray(v)
        ? [v.length, 'item']
        : [Object.keys(v as object).length, 'field']
  const size = unit === 'character' ? intl.formatMessage({ id: 'chat.approval.characters', defaultMessage: '{count, plural, one {# character} other {# characters}}' }, { count: n }) : unit === 'item' ? intl.formatMessage({ id: 'chat.approval.items', defaultMessage: '{count, plural, one {# item} other {# items}}' }, { count: n }) : intl.formatMessage({ id: 'chat.approval.fields', defaultMessage: '{count, plural, one {# field} other {# fields}}' }, { count: n })
  return `${fieldLabel(key, intl, undefined, tool, version, key)} · ${size}`
}

function RawArguments({ value }: { value: unknown }) {
  return (
    <ApprovalDetails summary={<FormattedMessage id="chat.approval.field.raw_arguments" defaultMessage="Raw arguments" />}>
      <ApprovalCode>{JSON.stringify(value, null, 2)}</ApprovalCode>
    </ApprovalDetails>
  )
}

/** Each entry on its own row; a value too big for a row folds behind a summary that names
 * its key and size — never one row holding a JSON blob. */
function ArgumentRows({ entries, format, tool, version, authorizedPaths }: { entries: Entry[]; format?: Format; tool?: string; version?: string; authorizedPaths?: Set<string> }) {
  const intl = useAppIntl()
  const trustedTool = (key: string) => !/[.*]/.test(key) && (!authorizedPaths || authorizedPaths.has(key)) ? tool : undefined
  const facts: Array<[string, string]> = []
  const tables: Array<[string, Record<string, unknown>[]]> = []
  const folds: Entry[] = []
  for (const [key, value] of entries) {
    if (isRecordList(value)) {
      tables.push([key, value])
      continue
    }
    const text = inlineText(value, intl, trustedTool(key), version, key)
    if (text === null) folds.push([key, value])
    else facts.push([key, text])
  }
  if (entries.length === 0) return null
  // Folds and tables share the facts block, so a card of nothing BUT them still has one.
  return (
    <ApprovalFacts>
      {facts.map(([key, text]) => (
        <ApprovalFact key={key} label={fieldLabel(key, intl, undefined, trustedTool(key), version, key)}>
          {text}
        </ApprovalFact>
      ))}
      {tables.map(([key, rows]) => (
        <RecordsTable key={key} rows={rows} format={format} tool={trustedTool(key)} version={version} path={key} />
      ))}
      {folds.map(([key, value]) => (
        <ApprovalDetails key={key} summary={foldSummary(key, value, intl, trustedTool(key), version)}>
          <ApprovalCode>
            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          </ApprovalCode>
        </ApprovalDetails>
      ))}
    </ApprovalFacts>
  )
}

type Format = (key: string, value: unknown) => unknown

// A short list of records (assignments, renames, one row per item) IS the change: shown as a
// table, never folded behind "2 items". A long one still folds.
const isRecordList = (v: unknown): v is Record<string, unknown>[] =>
  Array.isArray(v) && v.length > 0 && v.length <= 12 && v.every(isRecord)

function RecordsTable({ rows, format, tool, version, path }: { rows: Record<string, unknown>[]; format?: Format; tool?: string; version?: string; path: string }) {
  const intl = useAppIntl()
  const named = rows.map((r) => Object.fromEntries(namedEntries(r, format)))
  const columns = [...new Set(named.flatMap((r) => Object.keys(r)))]
  const originalCell = (row: number, column: string) =>
    Object.hasOwn(rows[row] || {}, column) && JSON.stringify(rows[row]?.[column]) === JSON.stringify(named[row]?.[column])
  return (
    <ApprovalTable
      head={columns.map((column) => fieldLabel(column, intl, undefined, !/[.*]/.test(column) && named.every((row, i) => !Object.hasOwn(row, column) || originalCell(i, column)) ? tool : undefined, version, `${path}.*.${column}`))}
      rows={named.map((r, i) => ({
        key: i,
        cells: columns.map((c) => <BatchCell key={c} field={c} value={r[c]} tool={!/[.*]/.test(c) && originalCell(i, c) ? tool : undefined} version={version} path={`${path}.*.${c}`} />),
      }))}
    />
  )
}

// A record's entries with names standing in for their ids (`envelope_name` replaces
// `envelope_id`, labelled "Envelope"); `format` may restyle a value (a budget amount).
function namedEntries(record: Record<string, unknown>, format?: Format): Entry[] {
  return withNamesInPlace(record)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]): Entry => [key, format ? format(key, value) : value])
}

// Bookkeeping on the change itself — never part of what is being confirmed.
const OMIT = new Set([
  'type',
  'id',
  'status',
  'confirmed',
  'display',
  'reason',
  'refused',
  'grant_tool',
  'tool_use_id',
  'session_id',
  'enum_schema_version',
])

// What a card shows, in order of trust: a gated tool's own arguments, the backend's
// `display` summary, then the change's meaningful top-level payload. The tool's name is
// never an entry — the header already says what the card does.
function genericEntries(change: ProposedChange): Entry[] {
  const display = (change.display || {}) as Record<string, unknown>
  const shown = ([key, value]: Entry) =>
    value != null && value !== '' && !(key === 'tool' && value === change.grant_tool)
  if (change.grant_tool && isRecord(display.arguments)) {
    return Object.entries(display.arguments).filter(shown)
  }
  const fromDisplay = withNamesInPlace(display)
    // `op` is the card's title (CardHeader), not a fact.
    .filter(([key]) => key !== 'op')
    .filter(shown)
  if (fromDisplay.length > 0) return fromDisplay
  return Object.entries(change as unknown as Record<string, unknown>).filter(
    (entry) => !OMIT.has(entry[0]) && shown(entry),
  )
}

// Generic fallback for ANY change type without a bespoke body — including future tools'
// changes — and every gated tool that has no card of its own. The load-bearing safety net:
// the user always sees what they're confirming.
export function GenericChangePreview({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const entries = genericEntries(change)
  if (entries.length === 0) {
    return (
      <ApprovalNote>
        {change.grant_tool && isRecord(change.display?.arguments)
          ? intl.formatMessage({ id: 'chat.approval.noArguments', defaultMessage: 'No arguments' })
          : intl.formatMessage({ id: 'chat.approval.noFurtherDetails', defaultMessage: 'No further details' })}
      </ApprovalNote>
    )
  }
  return <ArgumentRows entries={entries} tool={isRecord(change.display?.arguments) ? change.grant_tool : undefined} version={change.enum_schema_version} />
}

type WordPart = { text: string; op: 'context' | 'added' | 'removed' }
type DiffRow = { kind: DiffKind; text: string; parts?: WordPart[] }
type DiffItem = { type: 'line'; row: DiffRow } | { type: 'collapsed'; rows: DiffRow[] }

// Below this share of unchanged characters a line was rewritten, not edited — one line
// interleaving two different sentences is unreadable, so the pair stays two lines.
const MIN_SHARED = 0.4

function splitLines(value: string): string[] {
  const lines = value.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

// A one-line instruction edited by a phrase is one removed and one added line; show it once,
// colouring only the words that changed, so the edit is visible without comparing two
// paragraphs by eye. Null when the line was rewritten or differs only in whitespace.
function mergedRow(removed: string, added: string): DiffRow | null {
  const parts = diffWords(removed, added).map(
    (c): WordPart => ({ text: c.value, op: c.added ? 'added' : c.removed ? 'removed' : 'context' }),
  )
  const shared = parts.filter((p) => p.op === 'context').reduce((n, p) => n + p.text.length, 0)
  if (shared < MIN_SHARED * Math.max(removed.length, added.length)) return null
  if (parts.every((p) => p.op === 'context')) return null
  return { kind: 'edited', text: added, parts }
}

function pairedRows(removed: string[], added: string[]): DiffRow[] {
  const asBlocks = () => [
    ...removed.map((text): DiffRow => ({ kind: 'removed', text })),
    ...added.map((text): DiffRow => ({ kind: 'added', text })),
  ]
  if (removed.length !== added.length) return asBlocks()
  const merged = removed.map((text, j) => mergedRow(text, added[j]!))
  if (merged.every((row) => row === null)) return asBlocks()
  return merged.flatMap((row, j): DiffRow[] =>
    row
      ? [row]
      : [
          { kind: 'removed', text: removed[j]! },
          { kind: 'added', text: added[j]! },
        ],
  )
}

function diffRows(before: string, after: string): DiffRow[] {
  const hunks = diffLines(before, after)
  return hunks.flatMap((hunk, i) => {
    const next = hunks[i + 1]
    if (hunk.added && hunks[i - 1]?.removed) return []
    if (hunk.removed && next?.added) {
      return pairedRows(splitLines(hunk.value), splitLines(next.value))
    }
    const kind: DiffKind = hunk.added ? 'added' : hunk.removed ? 'removed' : 'context'
    return splitLines(hunk.value).map((text): DiffRow => ({ kind, text }))
  })
}

// Keep `size` lines of context around every change; fold the rest into runs.
function collapseContext(rows: DiffRow[], size = 3): DiffItem[] {
  const items: DiffItem[] = []
  rows.forEach((row, i) => {
    const near = rows.slice(Math.max(0, i - size), i + size + 1).some((r) => r.kind !== 'context')
    const last = items[items.length - 1]
    if (near) items.push({ type: 'line', row })
    else if (last?.type === 'collapsed') last.rows.push(row)
    else items.push({ type: 'collapsed', rows: [row] })
  })
  return items
}

/** A line diff with its unchanged stretches folded; each expands on a tap. */
function TextDiff({ before, after }: { before: string; after: string }) {
  const intl = useAppIntl()
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const items = useMemo(() => collapseContext(diffRows(before, after)), [before, after])
  return (
    <ApprovalDiff>
      {items.map((item, i) => {
        if (item.type === 'line') {
          return (
            <ApprovalDiffLine key={i} kind={item.row.kind}>
              {item.row.parts
                ? item.row.parts.map((part, j) =>
                    part.op === 'context' ? (
                      part.text
                    ) : (
                      <ApprovalDiffWord key={j} op={part.op}>
                        {part.text}
                      </ApprovalDiffWord>
                    ),
                  )
                : item.row.text}
            </ApprovalDiffLine>
          )
        }
        if (expanded[i]) {
          return item.rows.map((row, j) => (
            <ApprovalDiffLine key={`${i}-${j}`} kind="context">
              {row.text}
            </ApprovalDiffLine>
          ))
        }
        const n = item.rows.length
        return (
          <ApprovalDiffLine key={i} kind="context">
            <ApprovalToggle onClick={() => setExpanded((prev) => ({ ...prev, [i]: true }))}>
              {intl.formatMessage({ id: 'chat.approval.unchangedLines', defaultMessage: 'Show {count, plural, one {# unchanged line} other {# unchanged lines}}' }, { count: n })}
            </ApprovalToggle>
          </ApprovalDiffLine>
        )
      })}
    </ApprovalDiff>
  )
}

export function PermissionArgumentsPreview({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const args = permissionArguments(change)
  const identifiers = Object.entries(args).filter(
    ([key, value]) =>
      key !== 'changes' && key !== 'prompt' && value !== '' && typeof value !== 'object',
  )

  return (
    <>
      <ArgumentRows entries={identifiers} tool={change.grant_tool} version={change.enum_schema_version} />
      {permissionTextEdits(change).map((edit) => (
        <ApprovalSection key={edit.path} title={fieldPathLabel(edit.path, intl, edit.schemaPathSafe ? change.grant_tool : undefined, change.enum_schema_version)}>
          <TextDiff before={edit.old} after={edit.new} />
        </ApprovalSection>
      ))}
      <RawArguments value={args} />
    </>
  )
}

// One automation field: a short value is a before → after row; text and structures get a
// line diff under a muted field label.
function AutomationFieldDiffView({
  fieldName,
  oldVal,
  newVal,
}: {
  fieldName: string
  oldVal: unknown
  newVal: unknown
}) {
  const intl = useAppIntl()
  const structured = !isScalar(oldVal) || !isScalar(newVal)
  const toText = (v: unknown) =>
    structured ? JSON.stringify(v ?? null, null, 2) : v == null ? '' : String(v)
  return (
    <>
      <ApprovalMeta items={[fieldLabel(fieldName, intl)]} />
      <TextDiff before={toText(oldVal)} after={toText(newVal)} />
    </>
  )
}

const isShort = (v: unknown) =>
  isScalar(v) && !(typeof v === 'string' && (v.includes('\n') || v.length > INLINE_MAX))

function AutomationChanges({ changes }: { changes: Record<string, AutomationFieldChange> }) {
  const intl = useAppIntl()
  const fields = Object.entries(changes)
  const short = fields.filter(([, c]) => isShort(c.old) && isShort(c.new))
  const long = fields.filter(([, c]) => !(isShort(c.old) && isShort(c.new)))
  if (fields.length === 0) return <ApprovalNote>{<FormattedMessage id="chat.approval.field.no_changes" defaultMessage="No changes" />}</ApprovalNote>
  return (
    <>
      {short.length > 0 && (
        <ApprovalFacts>
          {short.map(([field, c]) => (
            <ApprovalChange
              key={field}
              label={fieldLabel(field, intl)}
              before={displayValue(c.old, intl)}
              after={displayValue(c.new, intl)}
            />
          ))}
        </ApprovalFacts>
      )}
      {long.map(([field, c]) => (
        <AutomationFieldDiffView key={field} fieldName={field} oldVal={c.old} newVal={c.new} />
      ))}
    </>
  )
}

// A budget write's gate card (`_budget_confirm.NAMED_ARGS_PREVIEW`): the call's arguments
// with each envelope / group named instead of its id, a budget amount as money.
const budgetAmount: Format = (key, value) =>
  key === 'amount' && typeof value === 'number' ? fBase(value) : value

function unchangedArgumentPaths(entries: Entry[], raw: unknown): Set<string> {
  if (!isRecord(raw)) return new Set()
  return new Set(entries.filter(([key, value]) => Object.hasOwn(raw, key) && JSON.stringify(raw[key]) === JSON.stringify(value)).map(([key]) => key))
}

function NamedArgsPreview({ preview, change }: { preview: ToolPreview; change?: ProposedChange }) {
  const rawEntries = namedEntries(isRecord(preview.data) ? preview.data : {})
  const entries = rawEntries.map(([key, value]): Entry => [key, budgetAmount(key, value)])
  return (
    <>
      {entries.length > 0 ? (
        <ArgumentRows entries={entries} format={budgetAmount} tool={change?.grant_tool} version={change?.enum_schema_version} authorizedPaths={unchangedArgumentPaths(rawEntries, preview.raw_arguments)} />
      ) : (
        <ApprovalNote tone="muted">{<FormattedMessage id="chat.approval.field.no_arguments" defaultMessage="No arguments" />}</ApprovalNote>
      )}
      {preview.raw_arguments && <RawArguments value={preview.raw_arguments} />}
    </>
  )
}

const PREVIEW_RENDERERS: Record<string, (preview: ToolPreview, change?: ProposedChange) => ReactElement> = {
  field_diff: (preview) => <FieldDiffPreview preview={preview} />,
  named_args: (preview, change) => <NamedArgsPreview preview={preview} change={change} />,
}

export function ToolPreviewBody({ preview, change }: { preview: ToolPreview; change?: ProposedChange }) {
  const renderer = PREVIEW_RENDERERS[preview.kind]
  return renderer ? renderer(preview, change) : <GenericPreviewBody preview={preview} change={change} />
}

function FieldDiffPreview({ preview }: { preview: ToolPreview }) {
  const intl = useAppIntl()
  const updates = (
    Array.isArray(preview.data?.items) ? preview.data.items : []
  ) as AutomationUpdateDisplay[]

  return (
    <>
      {previewHasNoChanges(preview) ? (
        <ApprovalNote>{<FormattedMessage id="chat.approval.field.the_proposed_values_match_the_current_automation" defaultMessage="The proposed values match the current automation" />}</ApprovalNote>
      ) : (
        updates.map((update, i) => (
          <ApprovalSection
            key={update.id || i}
            title={update.name || update.id || intl.formatMessage({ id: 'chat.approval.automationNumber', defaultMessage: 'Automation {number}' }, { number: i + 1 })}
          >
            <AutomationChanges changes={update.changes || {}} />
          </ApprovalSection>
        ))
      )}
      <RawArguments value={preview.raw_arguments ?? {}} />
    </>
  )
}

// A preview kind this card has no renderer for: its data reads like any other arguments.
function GenericPreviewBody({ preview, change }: { preview: ToolPreview; change?: ProposedChange }) {
  const entries = Object.entries(preview.data ?? {}).filter(
    ([, value]) => value != null && value !== '',
  )
  return (
    <>
      {entries.length > 0 ? (
        <ArgumentRows entries={entries} tool={change?.grant_tool} version={change?.enum_schema_version} authorizedPaths={unchangedArgumentPaths(entries, preview.raw_arguments)} />
      ) : (
        <ApprovalNote>{<FormattedMessage id="chat.approval.field.no_preview_available" defaultMessage="No preview available" />}</ApprovalNote>
      )}
      {preview.raw_arguments && <RawArguments value={preview.raw_arguments} />}
    </>
  )
}
