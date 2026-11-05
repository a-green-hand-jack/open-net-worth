import { fieldLabel } from '../FieldLabels'
import type { IntlShape } from 'react-intl'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { FormattedMessage } from '../FormattedMessage'
import { useMemo, useState } from 'react'
import { diffLines } from 'diff'
import type { ProposedChange, TextEditDisplay } from '../../../../types/chat'
import {
  ApprovalDetails,
  ApprovalDiff,
  ApprovalDiffLine,
  ApprovalFact,
  ApprovalFacts,
  ApprovalMeta,
  ApprovalSection,
  ApprovalToggle,
} from '../ApprovalCard'
import { fmt } from '../cardTypes'

type Display = NonNullable<ProposedChange['display']>

const fieldName = (field: string) => field.replace(/_/g, ' ')
// A prompt with and without a final newline would otherwise show its last line as changed.
const endLine = (text: string) => (text.endsWith('\n') ? text : `${text}\n`)
const toolsText = (tools: string[], intl: IntlShape) => (tools.length > 0 ? tools.join(', ') : intl.formatMessage({ id: 'chat.agent.none', defaultMessage: 'none' }))
const clip = (text: string, max = 60) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

// The auto-apply grant (P3-AG4) means the agent may APPLY, not just propose — so it is a
// full-weight fact, never folded away. Absent/empty ⇒ propose-only.
function AutoApplyGrant({ grant }: { grant: Display['auto_apply'] }) {
  const intl = useAppIntl()
  if (!grant || grant.capabilities.length === 0) {
    return (
      <ApprovalFact label={<FormattedMessage id="chat.approval.field.auto_apply" defaultMessage="Auto-apply" />} tone="muted">
        {intl.formatMessage({ id: 'chat.agent.proposeOnly', defaultMessage: 'Propose only' })}
      </ApprovalFact>
    )
  }
  const unattended = grant.unattended_capabilities ?? []
  return (
    <>
      <ApprovalFact
        label={<FormattedMessage id="chat.approval.field.auto_apply" defaultMessage="Auto-apply" />}
        tone="bad"
        title={intl.formatMessage({ id: 'chat.approval.autoApplyHint', defaultMessage: 'The agent may apply these changes itself, not only propose them.' })}
      >
        {intl.formatMessage({ id: 'chat.agent.mayApply', defaultMessage: 'May apply: {capabilities}' }, { capabilities: grant.capabilities.join(', ') })}
      </ApprovalFact>
      {unattended.length > 0 && (
        <ApprovalFact
          label={<FormattedMessage id="chat.approval.field.unattended" defaultMessage="Unattended" />}
          tone="warn"
          title={intl.formatMessage({ id: 'chat.approval.unattendedHint', defaultMessage: 'Capabilities the agent may use on runs with no one watching.' })}
        >
          {unattended.join(', ')}
        </ApprovalFact>
      )}
      {grant.max_writes_per_run != null && (
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.max_writes_per_run" defaultMessage="Max writes per run" />}>{grant.max_writes_per_run}</ApprovalFact>
      )}
      {grant.max_amount_base != null && (
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.max_amount" defaultMessage="Max amount" />}>{fmt(grant.max_amount_base)}</ApprovalFact>
      )}
    </>
  )
}

/** An exact {old,new} text edit (RFC 2026-07-20 §14.2): the model supplied the delta, so it
 * renders as asked — nothing derived, no part of the surrounding body collapsed. */
export function TextEditCell({ edit }: { edit: TextEditDisplay }) {
  return (
    <ApprovalDiff>
      <ApprovalDiffLine kind="removed">
        {edit.old}
        {edit.old_truncated ? ' …' : ''}
      </ApprovalDiffLine>
      <ApprovalDiffLine kind="added">
        {edit.new}
        {edit.new_truncated ? ' …' : ''}
      </ApprovalDiffLine>
    </ApprovalDiff>
  )
}

function PromptText({ preview, full }: { preview?: string; full?: string }) {
  const intl = useAppIntl()
  const text = full || preview || ''
  if (!text) return null
  return (
    <ApprovalDetails summary={intl.formatMessage({ id: 'chat.agent.promptSummary', defaultMessage: 'Prompt · {preview}' }, { preview: clip(text) })}>
      <ApprovalDiff>
        {text.split('\n').map((line, i) => (
          <ApprovalDiffLine key={i} kind="added">
            {line}
          </ApprovalDiffLine>
        ))}
      </ApprovalDiff>
    </ApprovalDetails>
  )
}

function PromptDiffCell({
  oldFull,
  newPreview,
  newFull,
}: {
  oldFull?: string
  newPreview?: string
  newFull?: string
}) {
  const intl = useAppIntl()
  const [expanded, setExpanded] = useState(false)
  const hasDiff = oldFull != null && newFull != null
  const rows = useMemo(() => {
    if (!hasDiff) return []
    return diffLines(endLine(oldFull), endLine(newFull)).flatMap((hunk, i) => {
      const kind = hunk.added ? 'added' : hunk.removed ? 'removed' : 'context'
      const lines = hunk.value.split('\n')
      if (lines[lines.length - 1] === '') lines.pop()
      return lines.map((text, j) => ({ key: `${i}-${j}`, kind, text }) as const)
    })
  }, [hasDiff, oldFull, newFull])

  if (!hasDiff) return <PromptText preview={newPreview} full={newFull} />
  const count = (kind: 'added' | 'removed') => rows.filter((r) => r.kind === kind).length
  return (
    <ApprovalSection title={intl.formatMessage({ id: 'chat.agent.promptRewritten', defaultMessage: 'Prompt rewritten' })}>
      <ApprovalToggle onClick={() => setExpanded((e) => !e)}>
        {expanded ? intl.formatMessage({ id: 'chat.agent.hideDiff', defaultMessage: 'Hide diff' }) : intl.formatMessage({ id: 'chat.agent.showDiff', defaultMessage: 'Show diff · +{added} −{removed} lines' }, { added: count('added'), removed: count('removed') })}
      </ApprovalToggle>
      {expanded && (
        <ApprovalDiff>
          {rows.map((r) => (
            <ApprovalDiffLine key={r.key} kind={r.kind}>
              {r.text}
            </ApprovalDiffLine>
          ))}
        </ApprovalDiff>
      )}
    </ApprovalSection>
  )
}

export function AgentCreatePreview({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = change.display || {}
  const prompt = change.agent?.prompt
  return (
    <>
      <ApprovalMeta items={[d.description]} />
      <ApprovalFacts>
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.tools" defaultMessage="Tools" />}>{toolsText(d.allowed_tools || [], intl)}</ApprovalFact>
        {d.model && <ApprovalFact label={<FormattedMessage id="chat.approval.field.model" defaultMessage="Model" />}>{d.model}</ApprovalFact>}
        {d.channels && d.channels.length > 0 && (
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.channels" defaultMessage="Channels" />}>{d.channels.join(', ')}</ApprovalFact>
        )}
        <AutoApplyGrant grant={d.auto_apply} />
      </ApprovalFacts>
      <PromptText
        preview={d.prompt_preview}
        full={typeof prompt === 'string' ? prompt : undefined}
      />
    </>
  )
}

// Renders only the fields present in the change's display — the backend includes a field's
// new value only when it is being changed.
const AGENT_FIELDS_SHOWN = [
  'description',
  'prompt',
  'allowed_tools',
  'model',
  'channels',
  'enabled',
  'auto_apply',
]

function AgentUpdateFacts({ d, fields }: { d: Display; fields: string[] }) {
  const intl = useAppIntl()
  const empty = (v: unknown) => (v == null || v === '' ? '—' : String(v))
  return (
    <ApprovalFacts>
      {d.description != null && (
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.description" defaultMessage="Description" />}>{empty(d.description)}</ApprovalFact>
      )}
      {d.allowed_tools != null && (
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.tools" defaultMessage="Tools" />}>{toolsText(d.allowed_tools, intl)}</ApprovalFact>
      )}
      {d.model !== undefined && <ApprovalFact label={<FormattedMessage id="chat.approval.field.model" defaultMessage="Model" />}>{empty(d.model)}</ApprovalFact>}
      {d.channels !== undefined && (
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.channels" defaultMessage="Channels" />}>{empty(d.channels?.join(', '))}</ApprovalFact>
      )}
      {d.enabled !== undefined && (
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.enabled" defaultMessage="Enabled" />}>{d.enabled ? <FormattedMessage id="chat.approval.yes" defaultMessage="Yes" /> : <FormattedMessage id="chat.approval.no" defaultMessage="No" />}</ApprovalFact>
      )}
      {fields.includes('auto_apply') && <AutoApplyGrant grant={d.auto_apply} />}
    </ApprovalFacts>
  )
}

export function AgentUpdatePreview({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = change.display || {}
  const fields = d.changed_fields || []
  const others = fields.filter((f) => !AGENT_FIELDS_SHOWN.includes(f)).map((field) => fieldLabel(field, intl, fieldName(field)).toLowerCase())
  const newFullPrompt = change.changes?.prompt
  return (
    <>
      <ApprovalMeta items={[others.length > 0 && intl.formatMessage({ id: 'chat.agent.alsoChanges', defaultMessage: 'Also changes {fields}' }, { fields: others.join(', ') })]} />
      <AgentUpdateFacts d={d} fields={fields} />
      {d.prompt_edit ? (
        <ApprovalSection title={intl.formatMessage({ id: 'chat.approval.promptEdit', defaultMessage: 'Prompt edit' })}>
          <TextEditCell edit={d.prompt_edit} />
        </ApprovalSection>
      ) : d.prompt_preview != null ? (
        <PromptDiffCell
          oldFull={d.prompt_old}
          newPreview={d.prompt_preview}
          newFull={typeof newFullPrompt === 'string' ? newFullPrompt : undefined}
        />
      ) : null}
    </>
  )
}

export function SkillUpdateBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = change.display || {}
  const fields = d.changed_fields || []
  return (
    <>
      {fields.length > 0 && (
        <ApprovalFacts>
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.changes" defaultMessage="Changes" />}>{fields.map((field) => fieldLabel(field, intl, fieldName(field)).toLowerCase()).join(', ')}</ApprovalFact>
        </ApprovalFacts>
      )}
      {d.body_edit && (
        <ApprovalSection title={intl.formatMessage({ id: 'chat.approval.bodyEdit', defaultMessage: 'Body edit' })}>
          <TextEditCell edit={d.body_edit} />
        </ApprovalSection>
      )}
    </>
  )
}
