import { useAppIntl } from '../../../i18n/useAppIntl'
// LuciusHistorySidebar — the Lucius home tab's persistent, collapsible history rail.
//
// Reuses exactly what the floating dock's own ConversationMenu already computes
// (conversationGroups → selectVisibleRows/sortWithinSection → groupByAge) and its row UI
// (ConversationRow) — this list is always visible instead of toggled, but the data and the
// row chrome are identical to the dock's, so the two surfaces never drift apart.

import './lucius-home.css'
import { useState } from 'react'
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  MessageSquare,
  SquarePen,
  Zap,
} from '../../../ui/icons'
import {
  ConversationRow,
  ConversationIcon,
  groupByAge,
  RECENT_CAPTURES,
  selectVisibleRows,
  shortWhen,
  sortWithinSection,
  type ConversationKind,
} from '../../chat/ConversationMenu'
import type { ConversationMeta } from '../../../hooks/useConversations'
import type { ConvRowStatus } from '../../../types/chat'

const RECENT_RUNS = 5
const RECENT_CHATS = 25

export function LuciusHistorySidebar({
  groups,
  activeId,
  statusFor,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
  onStop,
  onViewAll,
  onMarkAllRead,
  onCollapse,
}: {
  groups: { key: ConversationKind; items: ConversationMeta[]; total: number }[]
  activeId: string
  statusFor: (id: string) => ConvRowStatus
  onNewChat: () => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onStop: (id: string) => void
  onViewAll: (kind: ConversationKind) => void
  onMarkAllRead: (ids: string[]) => void
  onCollapse: () => void
}) {
  const intl = useAppIntl()
  const [editingId, setEditingId] = useState<string | null>(null)

  const runs = groups.find((g) => g.key === 'automation')?.items ?? []
  const captures = groups.find((g) => g.key === 'capture')?.items ?? []
  const chats = groups.find((g) => g.key === 'chat')?.items ?? []
  const visibleRuns = sortWithinSection(selectVisibleRows(runs, statusFor, RECENT_RUNS), statusFor)
  const visibleCaptures = selectVisibleRows(captures, statusFor, RECENT_CAPTURES)
  const visibleChats = selectVisibleRows(chats, statusFor, RECENT_CHATS)
  // Every unread row in the section — not just the ones the rail shows. A run you never
  // open is otherwise unread forever, and "View all runs" is the only other way to clear it.
  const unreadIds = (items: ConversationMeta[]) =>
    items.filter((c) => ['done', 'failed'].includes(statusFor(c.id))).map((c) => c.id)
  const unreadRuns = unreadIds(runs)
  const unreadCaptures = unreadIds(captures)
  const unreadChats = unreadIds(chats)
  const markAllRead = (ids: string[]) =>
    ids.length > 0 && (
      <button
        type="button"
        className="conv-menu-markread"
        onClick={() => onMarkAllRead(ids)}
        aria-label={intl.formatMessage({ id: 'chat.markAllRead', defaultMessage: 'Mark all read' })}
        title={intl.formatMessage({ id: 'chat.markUnread', defaultMessage: 'Mark {count} unread as read' }, { count: ids.length })}
      >
        <CheckCheck size={14} />
      </button>
    )

  const row = (conv: ConversationMeta) => (
    <ConversationRow
      key={conv.id}
      conv={conv}
      active={conv.id === activeId}
      status={statusFor(conv.id)}
      when={shortWhen(conv, intl)}
      editing={editingId === conv.id}
      onSelect={onSelect}
      onStartRename={setEditingId}
      onCommitRename={(title) => {
        setEditingId(null)
        onRename(conv.id, title)
      }}
      onCancelRename={() => setEditingId(null)}
      onDelete={onDelete}
      onStop={onStop}
      icon={<ConversationIcon conv={conv} />}
    />
  )

  return (
    <aside className="lucius-home-side">
      <div className="lucius-home-side-top">
        <button type="button" className="lucius-home-side-new" onClick={onNewChat}>
          <SquarePen size={14} />
          {intl.formatMessage({ id: 'chat.new', defaultMessage: 'New' })}
        </button>
        <button
          type="button"
          className="lucius-home-side-collapse"
          onClick={onCollapse}
          aria-label={intl.formatMessage({ id: 'chat.hideHistory', defaultMessage: 'Hide chat history' })}
          title={intl.formatMessage({ id: 'chat.hideHistory', defaultMessage: 'Hide chat history' })}
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="lucius-home-side-scroll">
        {runs.length > 0 && (
          <div className="conv-menu-sec">
            <div className="conv-menu-sec-h">
              <ListChecks size={14} />
              <span>{intl.formatMessage({ id: 'chat.automationRuns', defaultMessage: 'Automation runs' })}</span>
              {markAllRead(unreadRuns)}
              <button
                type="button"
                className="conv-menu-viewall"
                onClick={() => onViewAll('automation')}
                aria-label={intl.formatMessage({ id: 'chat.viewRuns', defaultMessage: 'View all runs' })}
                title={intl.formatMessage({ id: 'chat.viewRuns', defaultMessage: 'View all runs' })}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {visibleRuns.map(row)}
            <button
              type="button"
              className="conv-menu-more"
              onClick={() => onViewAll('automation')}
            >
              {intl.formatMessage({ id: 'remaining.history.runs', defaultMessage: 'View all runs' })}
            </button>
          </div>
        )}

        {captures.length > 0 && (
          <div className="conv-menu-sec">
            <div className="conv-menu-sec-h">
              <Zap size={14} />
              <span>{intl.formatMessage({ id: 'chat.captures', defaultMessage: 'Captures' })}</span>
              {markAllRead(unreadCaptures)}
              <button
                type="button"
                className="conv-menu-viewall"
                onClick={() => onViewAll('capture')}
                aria-label={intl.formatMessage({ id: 'chat.viewCaptures', defaultMessage: 'View all captures' })}
                title={intl.formatMessage({ id: 'chat.viewCaptures', defaultMessage: 'View all captures' })}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {visibleCaptures.map(row)}
            <button type="button" className="conv-menu-more" onClick={() => onViewAll('capture')}>
              {intl.formatMessage({ id: 'remaining.history.captures', defaultMessage: 'View all captures' })}
            </button>
          </div>
        )}

        <div className="conv-menu-sec conv-menu-sec--fill">
          <div className="conv-menu-sec-h">
            <MessageSquare size={14} />
            <span>{intl.formatMessage({ id: 'chat.chats', defaultMessage: 'Chats' })}</span>
            {markAllRead(unreadChats)}
            <button
              type="button"
              className="conv-menu-viewall"
              onClick={() => onViewAll('chat')}
              aria-label={intl.formatMessage({ id: 'chat.viewChats', defaultMessage: 'View all conversations' })}
              title={intl.formatMessage({ id: 'chat.viewChats', defaultMessage: 'View all conversations' })}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          {chats.length === 0 ? (
            <div className="conv-menu-empty">{intl.formatMessage({ id: 'chat.noChats', defaultMessage: 'No chats yet.' })}</div>
          ) : (
            groupByAge(visibleChats).map((bucket) => (
              <div key={bucket.label} className="conv-menu-bucket">
                <div className="conv-menu-bucket-h">{bucket.label}</div>
                {sortWithinSection(bucket.items, statusFor).map(row)}
              </div>
            ))
          )}
          <button type="button" className="conv-menu-more" onClick={() => onViewAll('chat')}>
            {intl.formatMessage({ id: 'remaining.history.conversations', defaultMessage: 'View all conversations' })}
          </button>
        </div>
      </div>
    </aside>
  )
}
