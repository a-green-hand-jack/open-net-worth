// "Tell Lucius what to remember or change" — one message, one memory-model call that adds,
// rewrites or forgets (POST /api/memory/instruct). A box that grows with what is typed (Enter
// sends, Shift+Enter starts a new line), pinned to the bottom of the list, and above it the
// outcome in one sentence — "No changes were made." / "Updated a memory in Housing" — with what
// changed under it, or See why for Lucius's own reason when nothing did: a count alone
// ("Updated 2") left the person guessing which facts moved (owner reports, 2026-10-28/31).
import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp } from '../../../ui/icons'
import { TurnActivity } from '../../chat/TurnActivity'
import type { InstructChange, InstructOutcome } from '../../../hooks/useMemoryFacts'
import { defineMessages, type IntlShape } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const KIND = defineMessages({
  added: { id: 'memory.change.added', defaultMessage: 'Added' },
  updated: { id: 'memory.change.updated', defaultMessage: 'Updated' },
  removed: { id: 'memory.change.removed', defaultMessage: 'Forgot' },
})

/** The topic a change landed in — "Debt reduction" from "Plans · Debt reduction". */
function topicOf(where: string): string {
  return where.split(' · ').pop() || where
}

/** One sentence for what happened: "Updated a memory in Debt reduction", "Changed 3 memories".
 *  A bare count ("Updated 1") read as nothing (owner, 2026-10-31). */
function headline(changes: InstructChange[], intl: IntlShape): string {
  if (!changes.length)
    return intl.formatMessage({ id: 'memory.change.none', defaultMessage: 'No changes were made.' })
  const [c] = changes
  if (changes.length === 1 && c) {
    return c.where
      ? intl.formatMessage(
          { id: 'memory.change.oneIn', defaultMessage: '{action} a memory in {topic}' },
          { action: intl.formatMessage(KIND[c.change]), topic: topicOf(c.where) },
        )
      : intl.formatMessage(
          { id: 'memory.change.one', defaultMessage: '{action} a memory' },
          { action: intl.formatMessage(KIND[c.change]) },
        )
  }
  // each line below says which kind, so the count is all the heading needs
  return intl.formatMessage(
    { id: 'memory.change.many', defaultMessage: 'Changed {count} memories' },
    { count: changes.length },
  )
}

/** Each change: the text as it now stands, and what it said before. Which kind and where only
 *  when there are several — for one, the headline already says both. */
function ChangeList({ changes }: { changes: InstructChange[] }) {
  const { formatMessage } = useAppIntl()
  const several = changes.length > 1
  return (
    <ul className="rd-mem-changes-list">
      {changes.map((c, i) => (
        <li key={i} className={`is-${c.change}`}>
          {several && (
            <div className="rd-mem-change-meta">
              <span className="rd-mem-change-kind">{formatMessage(KIND[c.change])}</span>
              {c.where && <span className="rd-mem-change-where">{topicOf(c.where)}</span>}
            </div>
          )}
          <div className={c.change === 'removed' ? 'rd-mem-change-t is-gone' : 'rd-mem-change-t'}>
            {c.text}
          </div>
          {c.was && (
            <div className="rd-mem-change-was">
              {formatMessage(
                { id: 'memory.change.before', defaultMessage: 'Before: {content}' },
                { content: c.was },
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** The outcome. Open by itself when something changed, and then the changes ARE the answer —
 *  Lucius's own sentence only restated them, so it shows only when nothing changed (behind See
 *  why) or beside something he refused. */
function MemoryOutcome({ outcome }: { outcome: InstructOutcome }) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const { changes, reply, refused } = outcome
  const [open, setOpen] = useState(changes.length > 0)
  const why = changes.length ? '' : reply
  const hasDetail = Boolean(why || refused || changes.length)
  return (
    <div className="rd-mem-outcome" role="status">
      <div className="rd-mem-outcome-head">
        <span>{headline(changes, intl)}</span>
        {hasDetail && (
          <button
            type="button"
            className="rd-mem-outcome-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open
              ? formatMessage({ id: 'memory.change.hide', defaultMessage: 'Hide' })
              : changes.length
                ? formatMessage({ id: 'memory.change.show', defaultMessage: 'Show' })
                : formatMessage({ id: 'memory.change.why', defaultMessage: 'See why' })}
          </button>
        )}
      </div>
      {open && (
        <div className="rd-mem-outcome-body">
          {why && <p className="rd-mem-outcome-reply">{why}</p>}
          {refused && <p className="rd-mem-outcome-refused">{refused}</p>}
          {changes.length > 0 && <ChangeList changes={changes} />}
        </div>
      )}
    </div>
  )
}

const MAX_HEIGHT_PX = 160

export function MemoryAskBox({
  disabled,
  placeholder,
  onSubmit,
}: {
  disabled?: boolean
  placeholder?: string
  /** What happened, or null when the change was refused or failed (the box keeps its text). */
  onSubmit: (text: string) => Promise<InstructOutcome | null>
}) {
  const { formatMessage } = useAppIntl()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<{ n: number; out: InstructOutcome } | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  // Grow with the text, up to a few lines, then scroll inside.
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [text])

  async function send() {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    const out = await onSubmit(t)
    if (out) {
      setText('')
      setOutcome((prev) => ({ n: (prev?.n ?? 0) + 1, out }))
    }
    setBusy(false)
    area.current?.focus()
  }

  return (
    <div className="rd-mem-dock">
      {/* The chat's own working line while Lucius thinks: a spinner on the send button alone
          did not say anything was happening (owner, 2026-10-31). */}
      {busy ? <TurnActivity /> : outcome && <MemoryOutcome key={outcome.n} outcome={outcome.out} />}
      <form
        className="rd-mem-ask"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <textarea
          ref={area}
          className="rd-mem-ask-input"
          rows={1}
          value={text}
          // Read-only while Lucius works, not disabled: a disabled box drops focus, and the
          // dialog's focus trap then lands it on the whole window, which draws its focus ring.
          disabled={disabled}
          readOnly={busy}
          maxLength={1000}
          placeholder={
            disabled
              ? formatMessage({
                  id: 'memory.ask.disabled',
                  defaultMessage: 'Turn memory on to make changes',
                })
              : (placeholder ??
                formatMessage({
                  id: 'memory.ask.prompt',
                  defaultMessage: 'Tell Lucius what to remember or change',
                }))
          }
          aria-label={formatMessage({
            id: 'memory.ask.prompt',
            defaultMessage: 'Tell Lucius what to remember or change',
          })}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <button
          type="submit"
          className="rd-mem-send"
          title={formatMessage({ id: 'memory.ask.update', defaultMessage: 'Update memory' })}
          aria-label={formatMessage({ id: 'memory.ask.update', defaultMessage: 'Update memory' })}
          aria-busy={busy || undefined}
          disabled={disabled || busy || !text.trim()}
        >
          {busy ? (
            <span className="rd-mem-spin" aria-hidden="true" />
          ) : (
            <ArrowUp size={16} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  )
}
