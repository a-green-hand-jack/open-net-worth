import { getNumberLocale } from '../../../utils/format'
// Settings → Memory → Start import: copy a prompt for another assistant, paste what it printed,
// review where every line would go, and only then save the ones you keep. Nothing is written
// before "Import N".
import { useEffect, useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { defineMessages, type IntlShape } from 'react-intl'
import { invalidateQueryCache } from '../../../state/queryCache'
import { MEMORY_FACTS_KEY } from '../../../hooks/useMemoryFacts'
import {
  IMPORT_MAX_CHARS,
  applyImport,
  getImportPrompt,
  previewImport,
  type ImportItem,
} from '../../../hooks/memoryImport'
import { Btn, Modal } from './ds'
import type { Toast } from './ds'
import { SECTIONS } from './memoryGroups'

type Step = 'prompt' | 'paste' | 'review'

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  nickname: 'Preferred name',
  marital_status: 'Marital status',
  employment_types: 'Employment',
  risk_tolerance: 'Risk tolerance',
}

const fieldMessages = defineMessages({
  name: { id: 'memoryImport.field.name', defaultMessage: 'Name' },
  nickname: { id: 'memoryImport.field.nickname', defaultMessage: 'Preferred name' },
  marital_status: { id: 'memoryImport.field.marital', defaultMessage: 'Marital status' },
  employment_types: { id: 'memoryImport.field.employment', defaultMessage: 'Employment' },
  risk_tolerance: { id: 'memoryImport.field.risk', defaultMessage: 'Risk tolerance' },
})
const sectionMessages = defineMessages({
  you: { id: 'memory.section.you', defaultMessage: 'You' },
  money: { id: 'memory.section.money', defaultMessage: 'Money' },
  plans: { id: 'memory.section.plans', defaultMessage: 'Plans' },
  open_items: { id: 'memory.section.recent', defaultMessage: 'Recent' },
  other: { id: 'memory.section.other', defaultMessage: 'Other' },
})

const reasonMessages = defineMessages({
  'memoryImport.reason.sorted': {
    id: 'memoryImport.reason.sorted',
    defaultMessage: 'Sorted by Lucius.',
  },
  'memoryImport.reason.sensitive': {
    id: 'memoryImport.reason.sensitive',
    defaultMessage: 'Sensitive topic — turn on Include sensitive topics to import it.',
  },
  'memoryImport.reason.identifier': {
    id: 'memoryImport.reason.identifier',
    defaultMessage: 'Holds a full card, account or ID number or a password, which are never kept.',
  },
  'memoryImport.reason.profileFallback': {
    id: 'memoryImport.reason.profileFallback',
    defaultMessage: 'No profile field fits this, so it is kept as a note about you.',
  },
  'memoryImport.reason.unsorted': {
    id: 'memoryImport.reason.unsorted',
    defaultMessage: "Lucius couldn't sort this line. Add it by hand if you want to keep it.",
  },
})

const GROUP_TITLES: Record<string, string> = {
  profile: 'Profile',
  instructions: 'Instructions for Lucius',
  skip: 'Skipped',
}

const sectionLabel = (key?: string) => SECTIONS.find((s) => s.key === key)?.label ?? 'Other'

const joined = (v?: string | string[] | null) => (Array.isArray(v) ? v.join(', ') : (v ?? ''))

/** The words the user reads for an item: what would be saved, not the raw line. A profile field
 *  that already has a value shows it too. */
function itemText(i: ImportItem, intl: IntlShape): string {
  if (i.destination === 'profile') {
    const now = joined(i.current)
    const field = i.field ?? ''
    const descriptor = fieldMessages[field as keyof typeof fieldMessages]
    const base = `${descriptor ? intl.formatMessage(descriptor) : (FIELD_LABELS[field] ?? field)}: ${joined(i.value)}`
    return now
      ? intl.formatMessage(
          { id: 'memoryImport.currentValue', defaultMessage: '{base} (now: {value})' },
          { base, value: now },
        )
      : base
  }
  if (i.destination === 'instructions') return joined(i.value) || i.line
  if (i.destination === 'memory') return i.content || i.line
  return i.line
}

/** The review's groups, in the order the user reads them. Memory is split per section · topic. */
function groupItems(items: ImportItem[]): { title: string; entries: [ImportItem, number][] }[] {
  const groups = new Map<string, [ImportItem, number][]>()
  items.forEach((item, n) => {
    const title =
      item.destination === 'memory'
        ? item.topic
          ? `${sectionLabel(item.section)} · ${item.topic}`
          : sectionLabel(item.section)
        : (GROUP_TITLES[item.destination] ?? 'Skipped')
    groups.set(title, [...(groups.get(title) ?? []), [item, n]])
  })
  const order = (title: string) => {
    if (title === 'Skipped') return 3
    const fixed = ['Profile', 'Instructions for Lucius'].indexOf(title)
    return fixed >= 0 ? fixed : 2
  }
  return [...groups]
    .map(([title, entries]) => ({ title, entries }))
    .sort((x, y) => order(x.title) - order(y.title))
}

/** What the pasted line said, when the saved text is not simply that. */
function pastedLine(i: ImportItem): string {
  if (i.destination === 'skip') return ''
  const saved = i.destination === 'memory' ? i.content : joined(i.value)
  return (saved ?? '').trim() === i.line.trim() ? '' : i.line
}

export function MemoryImport({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  const { formatMessage } = useAppIntl()
  const [step, setStep] = useState<Step>('prompt')
  const [prompt, setPrompt] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [items, setItems] = useState<ImportItem[]>([])
  const [kept, setKept] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    getImportPrompt().then(
      (p) => live && setPrompt(p),
      () =>
        live &&
        setError(
          formatMessage({
            id: 'memoryImport.CouldNotLoadThePromptCloseThisAndTryAgain',
            defaultMessage: 'Could not load the prompt. Close this and try again.',
          }),
        ),
    )
    return () => {
      live = false
    }
  }, [formatMessage])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt ?? '')
      toast(formatMessage({ id: 'memoryImport.PromptCopied', defaultMessage: 'Prompt copied' }))
    } catch {
      toast(
        formatMessage({
          id: 'memoryImport.CouldNotCopySelectTheTextAndCopyItYourself',
          defaultMessage: 'Could not copy. Select the text and copy it yourself.',
        }),
      )
    }
  }

  async function review() {
    setBusy(true)
    setError('')
    try {
      const found = await previewImport(text)
      setItems(found)
      setKept(new Set(found.flatMap((i, n) => (i.destination === 'skip' ? [] : [n]))))
      setStep('review')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : formatMessage({
              id: 'memoryImport.CouldNotReadThatTryAgain',
              defaultMessage: 'Could not read that. Try again.',
            }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    setError('')
    try {
      const out = await applyImport(items.filter((_, n) => kept.has(n)))
      const applied = out.applied.profile + out.applied.instructions + out.applied.memory
      invalidateQueryCache(MEMORY_FACTS_KEY)
      invalidateQueryCache('/api/profile')
      toast(
        out.rejected.length
          ? formatMessage(
              {
                id: 'memoryImport.summaryRejected',
                defaultMessage: 'Imported {applied} · {rejected} not imported',
              },
              { applied, rejected: out.rejected.length },
            )
          : formatMessage(
              { id: 'memoryImport.summary', defaultMessage: 'Imported {applied}' },
              { applied },
            ),
      )
      onClose()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : formatMessage({
              id: 'memoryImport.CouldNotImportTryAgain',
              defaultMessage: 'Could not import. Try again.',
            }),
      )
      setBusy(false)
    }
  }

  const toggle = (n: number) =>
    setKept((k) => {
      const next = new Set(k)
      if (!next.delete(n)) next.add(n)
      return next
    })

  const length = text.trim().length
  // Escape, the scrim and X wait out a request, like Cancel and Back do.
  const close = () => {
    if (!busy) onClose()
  }
  const tooLong = length > IMPORT_MAX_CHARS
  const footer = (
    <div className="rd-mi-foot">
      {step !== 'prompt' && (
        <Btn onClick={() => setStep(step === 'review' ? 'paste' : 'prompt')} disabled={busy}>
          {formatMessage({ id: 'memoryImport.Back', defaultMessage: 'Back' })}
        </Btn>
      )}
      <span className="rd-mi-foot-gap" />
      <Btn onClick={onClose} disabled={busy}>
        {formatMessage({ id: 'memoryImport.Cancel', defaultMessage: 'Cancel' })}
      </Btn>
      {step === 'prompt' && (
        <Btn variant="primary" onClick={() => setStep('paste')} disabled={!prompt}>
          {formatMessage({ id: 'memoryImport.Next', defaultMessage: 'Next' })}
        </Btn>
      )}
      {step === 'paste' && (
        <Btn
          variant="primary"
          onClick={() => void review()}
          disabled={busy || !text.trim() || tooLong}
        >
          {busy
            ? formatMessage({ id: 'memoryImport.Reading', defaultMessage: 'Reading…' })
            : formatMessage({ id: 'memoryImport.Review', defaultMessage: 'Review' })}
        </Btn>
      )}
      {step === 'review' && (
        <Btn variant="primary" onClick={() => void save()} disabled={busy || kept.size === 0}>
          {busy
            ? formatMessage({ id: 'memoryImport.Importing', defaultMessage: 'Importing…' })
            : formatMessage(
                { id: 'memoryImport.importCount', defaultMessage: 'Import {count}' },
                { count: kept.size },
              )}
        </Btn>
      )}
    </div>
  )

  return (
    <Modal
      title={formatMessage({
        id: 'memoryImport.ImportMemoryFromAnotherAssistant',
        defaultMessage: 'Import memory from another assistant',
      })}
      size="lg"
      onClose={close}
      footer={footer}
    >
      <div className="rd-mi">
        <div className="rd-help">
          {formatMessage(
            { id: 'memoryImport.step', defaultMessage: 'Step {step} of 3' },
            { step: ['prompt', 'paste', 'review'].indexOf(step) + 1 },
          )}
        </div>
        {error && (
          <div className="rd-mi-error" role="alert">
            {error}
          </div>
        )}
        {step === 'prompt' && (
          <>
            <p className="rd-mi-lead">
              {formatMessage({
                id: 'memoryImport.promptHint',
                defaultMessage:
                  'Run this in your other AI account. It asks that assistant to list what it knows about you.',
              })}
            </p>
            <pre className="rd-mi-prompt">
              {prompt ?? formatMessage({ id: 'memoryImport.Loading', defaultMessage: 'Loading…' })}
            </pre>
            <Btn size="xs" onClick={() => void copyPrompt()} disabled={!prompt}>
              {formatMessage({ id: 'memoryImport.CopyPrompt', defaultMessage: 'Copy prompt' })}
            </Btn>
          </>
        )}
        {step === 'paste' && (
          <>
            <p className="rd-mi-lead">
              {formatMessage({
                id: 'memoryImport.pasteHint',
                defaultMessage:
                  'Paste the answer here. Lucius sorts it, and you review every line before anything is saved.',
              })}
            </p>
            <textarea
              className="rd-textarea rd-mi-paste"
              aria-label={formatMessage({
                id: 'memoryImport.PastedMemory',
                defaultMessage: 'Pasted memory',
              })}
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="[2026-03-01] - …"
            />
            <div className={'rd-mi-count' + (tooLong ? ' over' : '')}>
              {length.toLocaleString(getNumberLocale())} / {IMPORT_MAX_CHARS.toLocaleString(getNumberLocale())}
            </div>
          </>
        )}
        {step === 'review' && <ReviewList items={items} kept={kept} onToggle={toggle} />}
      </div>
    </Modal>
  )
}

function ReviewList({
  items,
  kept,
  onToggle,
}: {
  items: ImportItem[]
  kept: Set<number>
  onToggle: (n: number) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  if (!items.length)
    return (
      <p className="rd-mi-lead">
        {formatMessage({
          id: 'memoryImport.nothing',
          defaultMessage: 'Nothing in that text could be sorted.',
        })}
      </p>
    )
  return (
    <>
      <p className="rd-mi-lead">
        {formatMessage({
          id: 'memoryImport.reviewHint',
          defaultMessage: 'Untick anything you don’t want. Nothing is saved until you import.',
        })}
      </p>
      {groupItems(items).map((g) => (
        <section key={g.title} className="rd-mi-group">
          <h3 className="rd-mi-group-h">
            {(() => {
              const item = g.entries[0]![0]
              if (item.destination === 'memory') {
                const section =
                  sectionMessages[(item.section ?? 'other') as keyof typeof sectionMessages] ??
                  sectionMessages.other
                const label = formatMessage(section)
                return item.topic ? `${label} · ${item.topic}` : label
              }
              if (item.destination === 'profile')
                return formatMessage({
                  id: 'memoryImport.group.profile',
                  defaultMessage: 'Profile',
                })
              if (item.destination === 'instructions')
                return formatMessage({
                  id: 'memoryImport.group.instructions',
                  defaultMessage: 'Instructions for Lucius',
                })
              return formatMessage({ id: 'memoryImport.group.skipped', defaultMessage: 'Skipped' })
            })()}
          </h3>
          {g.entries.map(([item, n]) => {
            const skip = item.destination === 'skip'
            return (
              <div key={n} className="rd-mi-item">
                <input
                  id={`mi-${n}`}
                  type="checkbox"
                  checked={kept.has(n)}
                  disabled={skip}
                  onChange={() => onToggle(n)}
                />
                <div className="rd-mi-item-body">
                  <label htmlFor={`mi-${n}`}>{itemText(item, intl)}</label>
                  {pastedLine(item) && (
                    <div className="rd-mi-said">
                      {formatMessage(
                        { id: 'memoryImport.pasted', defaultMessage: 'Pasted: {text}' },
                        { text: pastedLine(item) },
                      )}
                    </div>
                  )}
                  <div className="rd-help">
                    {item.reason_message && Object.hasOwn(reasonMessages, item.reason_message.id)
                      ? formatMessage(
                          reasonMessages[item.reason_message.id as keyof typeof reasonMessages],
                        )
                      : item.reason}
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}
