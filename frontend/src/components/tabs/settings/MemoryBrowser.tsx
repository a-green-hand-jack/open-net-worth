// Settings → Memory, below the settings rows: everything Lucius remembers, laid out like Claude's
// memory — sections, a row per topic, and a topic's own page with a back link. Organising is
// Lucius's job (ADR 2026-10-25-memory-keeps-only-what-has-no-other-home, amendments 3–4): the user
// edits and forgets facts, deletes a topic, or tells Lucius what to change.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { ChevronLeft } from '../../../ui/icons'
import { fDate } from '../../../utils/format'
import { useMemoryFacts } from '../../../hooks/useMemoryFacts'
import { useHistoryStep } from '../../../hooks/useHistoryStep'
import { MemoryAskBox } from './MemoryAsk'
import { MEMORY_TOPIC_STEP } from '../../../hooks/useMemoryWindow'
import type { MemoryTopicStep } from '../../../hooks/useMemoryWindow'
import type { MemoryFact } from '../../../hooks/useMemoryFacts'
import { Btn } from './ds'
import type { SectionBack, Toast } from './ds'
import {
  ForgetConfirm,
  MemoryBullets,
  MemoryFactRows,
  MemoryHoverActs,
  MemorySwipeRow,
} from './MemoryParts'
import type { PendingForget, RowActs } from './MemoryParts'
import { SECTIONS, UNSORTED, groupFacts, matchesFilter, summaryOf, topicsOf } from './memoryGroups'
import type { Topic } from './memoryGroups'
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const sectionNames = defineMessages({
  you: { id: 'memory.section.you', defaultMessage: 'You' },
  money: { id: 'memory.section.money', defaultMessage: 'Money' },
  plans: { id: 'memory.section.plans', defaultMessage: 'Plans' },
  open_items: { id: 'memory.section.recent', defaultMessage: 'Recent' },
  other: { id: 'memory.section.other', defaultMessage: 'Other' },
  unsorted: { id: 'memory.section.older', defaultMessage: 'Older memories' },
})

/** The element the browser scrolls in: the Settings pane, the dialog's body, or the page. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight)
      return p
  }
  return document.scrollingElement as HTMLElement | null
}

function BackLink({ onClick }: { onClick: () => void }) {
  const { formatMessage } = useAppIntl()
  return (
    <button type="button" className="rd-mem-back" onClick={onClick}>
      <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      {formatMessage({ id: 'memory.title', defaultMessage: 'Memory' })}
    </button>
  )
}

/** A topic's row: its name, its summary (its first fact until Lucius has written one) and when it
 *  last changed. */
function TopicRow({
  topic,
  summary,
  onOpen,
  onDelete,
}: {
  topic: Topic
  summary: string
  onOpen: () => void
  onDelete: () => void
}) {
  const { formatMessage } = useAppIntl()
  const name = topic.named
    ? topic.name
    : formatMessage({ id: 'memory.general', defaultMessage: 'General' })
  const acts: RowActs = {
    editLabel: formatMessage({ id: 'memory.editNamed', defaultMessage: 'Edit {name}' }, { name }),
    forgetLabel: formatMessage(
      { id: 'memory.deleteNamed', defaultMessage: 'Delete {name}' },
      { name },
    ),
    word: formatMessage({ id: 'memory.delete', defaultMessage: 'Delete' }),
    onEdit: onOpen,
    onForget: onDelete,
  }
  return (
    <MemorySwipeRow acts={acts}>
      <div className="rd-mem-topic">
        <button type="button" className="rd-mem-topic-open" onClick={onOpen}>
          <span className="rd-mem-topic-name">{name}</span>
          <span className="rd-mem-topic-preview">{summary || topic.facts[0]?.content}</span>
          <span className="rd-mem-topic-date">
            {topic.updated
              ? formatMessage(
                  { id: 'memory.updated', defaultMessage: 'Updated {date}' },
                  { date: fDate(topic.updated) },
                )
              : ''}
          </span>
        </button>
        <MemoryHoverActs acts={acts} className="rd-mem-topic-acts" size={16} />
      </div>
    </MemorySwipeRow>
  )
}

/** `header` (the memory settings rows) shows above the list and is hidden while a topic is open —
 *  a topic's detail is its own page, as in Claude's memory. `filter` narrows the list to facts
 *  whose text or topic name contains it; `escapeRef` lets a host dialog ask the browser to back
 *  out of an open confirm or edit first (it returns true when it did). `onTopicOpen` tells a host
 *  when a topic page opens or closes, so it can hide list-wide actions. */
export function MemoryBrowser({
  toast,
  disabled,
  header,
  filter = '',
  escapeRef,
  onTopicOpen,
  placeBack,
}: {
  toast: Toast
  disabled?: boolean
  header?: ReactNode
  filter?: string
  escapeRef?: MutableRefObject<(() => boolean) | null>
  onTopicOpen?: (open: boolean) => void
  placeBack?: ((back: SectionBack | null) => void) | null
}) {
  const { formatMessage } = useAppIntl()
  const { facts, summaries, loading, forget, edit, instruct, deleteTopic } = useMemoryFacts(toast)
  // A topic's page is a history step, so Back (the gesture, the browser's, the app's) leaves it
  // for the list before it leaves the window or the page.
  const topicStep = useHistoryStep<MemoryTopicStep>(MEMORY_TOPIC_STEP)
  const open = topicStep.value
  const closeTopic = topicStep.close
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingForget | null>(null)
  const needle = filter.trim().toLowerCase()
  const all = groupFacts(facts)
  const shown = needle ? groupFacts(facts.filter((f) => matchesFilter(f, needle))) : all
  const top = useRef<HTMLDivElement>(null)

  // Opening a topic starts at its top; leaving it puts the list back where it was scrolled to.
  // Compared by value: a step read back from history is a fresh object each time.
  const openKey = open ? `${open.section}:${open.key}` : null
  const lastOpen = useRef(openKey)
  const listScroll = useRef<{ el: HTMLElement; y: number } | null>(null)
  useLayoutEffect(() => {
    if (lastOpen.current !== openKey) {
      const back = openKey ? null : listScroll.current
      if (back) back.el.scrollTop = back.y
      else top.current?.scrollIntoView({ block: 'start' })
    }
    lastOpen.current = openKey
  }, [openKey])

  function openTopic(next: { section: string; key: string }) {
    const el = scrollParent(top.current)
    listScroll.current = el ? { el, y: el.scrollTop } : null
    topicStep.open(next)
  }

  useEffect(() => {
    if (!escapeRef) return
    escapeRef.current = () => {
      if (pending) setPending(null)
      else if (editingId) setEditingId(null)
      else if (open) closeTopic()
      else return false
      return true
    }
    return () => {
      escapeRef.current = null
    }
  }, [escapeRef, pending, editingId, open, closeTopic])

  function confirm() {
    const p = pending
    setPending(null)
    if (p?.kind === 'one') void forget(p.fact.id)
    if (p?.kind === 'topic') {
      if (p.named) void deleteTopic(p.section, p.name)
      else p.ids.forEach((id) => void forget(id))
      closeTopic()
    }
  }

  // The filter decides which rows show; a row's preview, date and delete count are the whole topic.
  function whole(section: string, t: Topic): Topic {
    return topicsOf(all.bySection.get(section) ?? []).find((w) => w.key === t.key) ?? t
  }

  function askDelete(section: string, topic: Topic) {
    const t = whole(section, topic)
    setPending({
      kind: 'topic',
      name: t.name,
      section,
      ids: t.facts.map((f) => f.id),
      named: t.named,
    })
  }

  const factList = (list: MemoryFact[]) => ({
    facts: list,
    editingId,
    onEdit: setEditingId,
    onCancel: () => setEditingId(null),
    onSave: edit,
    onForget: (fact: MemoryFact) => setPending({ kind: 'one', fact }),
  })

  const confirmNode = pending && (
    <ForgetConfirm pending={pending} onCancel={() => setPending(null)} onConfirm={confirm} />
  )

  // A topic whose last fact was just forgotten no longer exists: fall back to the list.
  const topic = open
    ? topicsOf(all.bySection.get(open.section) ?? []).find((t) => t.key === open.key)
    : undefined
  const topicShown = Boolean(open && topic)
  useEffect(() => {
    onTopicOpen?.(topicShown)
  }, [onTopicOpen, topicShown])
  // Settings draws the way back itself (its title bar, or a phone's sheet arrow), so "Memory" isn't
  // said twice; elsewhere the page carries its own link.
  useEffect(() => {
    if (!placeBack) return
    placeBack(
      topicShown
        ? {
            label: formatMessage({ id: 'memory.title', defaultMessage: 'Memory' }),
            onBack: closeTopic,
          }
        : null,
    )
    return () => placeBack(null)
  }, [placeBack, topicShown, closeTopic, formatMessage])
  if (open && topic) {
    const summary = summaryOf(summaries, open.section, topic.key)
    return (
      <div className="rd-mem-detail" ref={top}>
        {placeBack ? null : <BackLink onClick={closeTopic} />}
        <div className="rd-mem-detail-head">
          <div className="rd-mem-detail-title">
            {topic.named
              ? topic.name
              : formatMessage({ id: 'memory.general', defaultMessage: 'General' })}
          </div>
          <Btn size="xs" variant="danger" onClick={() => askDelete(open.section, topic)}>
            {formatMessage({ id: 'memory.delete', defaultMessage: 'Delete' })}
          </Btn>
        </div>
        <div className="rd-mem-field">
          <div className="rd-mem-field-label">
            {formatMessage({ id: 'memory.lastUpdated', defaultMessage: 'Last updated' })}
          </div>
          <div>{topic.updated ? fDate(topic.updated) : '—'}</div>
        </div>
        {summary && (
          <div className="rd-mem-field">
            <div className="rd-mem-field-label">
              {formatMessage({ id: 'memory.summary', defaultMessage: 'Summary' })}
            </div>
            <div>{summary}</div>
          </div>
        )}
        <div className="rd-mem-field">
          <div className="rd-mem-field-label">
            {formatMessage({ id: 'memory.details', defaultMessage: 'Details' })}
          </div>
          <MemoryBullets {...factList(topic.facts)} />
        </div>
        <MemoryAskBox
          disabled={disabled}
          placeholder={formatMessage(
            { id: 'memory.tellChange', defaultMessage: 'Tell Lucius what to change about {name}' },
            {
              name: topic.named
                ? topic.name
                : formatMessage({ id: 'memory.general', defaultMessage: 'General' }),
            },
          )}
          onSubmit={(text) =>
            instruct(text, { section: open.section, topic: topic.named ? topic.name : undefined })
          }
        />
        {confirmNode}
      </div>
    )
  }

  const sections = [...SECTIONS, UNSORTED].filter((s) =>
    s.key === UNSORTED.key ? shown.unsorted.length : shown.bySection.get(s.key)?.length,
  )
  const nothingShown = sections.length === 0
  return (
    <div className="rd-mem-browser" ref={top}>
      {header}
      {loading ? (
        <div
          className="rd-factlist"
          aria-busy="true"
          aria-label={formatMessage({ id: 'memory.loading', defaultMessage: 'Loading memories' })}
        >
          {[0, 1, 2].map((i) => (
            <div className="rd-fact rd-fact-skel" key={i}>
              <span className="rd-set-skelbar" />
              <span className="rd-set-skelbar short" />
            </div>
          ))}
        </div>
      ) : nothingShown ? (
        <div className="rd-mem-empty">
          {needle
            ? formatMessage(
                { id: 'memory.noMatch', defaultMessage: 'No memories match “{query}”.' },
                { query: filter.trim() },
              )
            : formatMessage({
                id: 'memory.empty',
                defaultMessage:
                  'Nothing remembered yet. Tell Lucius something below, or he’ll pick things up as you talk.',
              })}
        </div>
      ) : (
        <>
          {sections.map((s) => {
            const label = Object.hasOwn(sectionNames, s.key)
              ? formatMessage(sectionNames[s.key as keyof typeof sectionNames])
              : s.label
            const note =
              s.key === 'open_items'
                ? formatMessage({
                    id: 'memory.recentNote',
                    defaultMessage:
                      'Decided or in flight over the last two weeks, from your chats — every Lucius run, a Capture or an automation included, sees these and acts on them. Each lapses on its date or once it is done.',
                  })
                : s.key === 'unsorted'
                  ? formatMessage({
                      id: 'memory.olderNote',
                      defaultMessage:
                        'Saved before memory had sections. Lucius is moving them into the new format in the background — filing each under a section and topic, or out of memory if it belongs elsewhere. You can still edit or forget them.',
                    })
                  : s.note
            const list =
              s.key === UNSORTED.key ? shown.unsorted : (shown.bySection.get(s.key) ?? [])
            return (
              <section className="rd-mem-sec" key={s.key} aria-label={label}>
                <div className="rd-mem-sec-h">{label}</div>
                {note ? <div className="rd-mem-sec-note">{note}</div> : null}
                {s.flat ? (
                  <MemoryFactRows {...factList(list)} />
                ) : (
                  topicsOf(list).map((t) => (
                    <TopicRow
                      key={t.key}
                      topic={whole(s.key, t)}
                      summary={summaryOf(summaries, s.key, t.key)}
                      onOpen={() => openTopic({ section: s.key, key: t.key })}
                      onDelete={() => askDelete(s.key, t)}
                    />
                  ))
                )}
              </section>
            )
          })}
        </>
      )}
      <MemoryAskBox disabled={disabled} onSubmit={(text) => instruct(text)} />
      {confirmNode}
    </div>
  )
}
