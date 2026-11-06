import { intelTimeAgo } from './relativeTime'
import { useAppIntl } from '../../i18n/useAppIntl'
import { queueLabel } from './labels'
import type { ReactNode } from 'react'
import { Archive, Check } from '../../ui/icons'
import { fDateTime } from '../../utils/format'
import { QUEUE_META, QUEUE_ORDER, type QueueStatus } from './signalQueue'
import type { StoryArc } from './storyMeta'

/** "Mark all read" + the Archive toggle for one tab's stories — the ticker desks' status bar and
 *  the Topics & macro feed bar share it. */
export function FeedTools({
  unread,
  archiveCount,
  showArchive,
  onToggleArchive,
  onMarkAllRead,
  backLabel = 'Back',
  children,
}: {
  unread: StoryArc[]
  archiveCount: number
  showArchive: boolean
  onToggleArchive: () => void
  onMarkAllRead: (ids: string[]) => void
  backLabel?: string
  /** Shown before the two tools (a sort menu, the last-scan note). */
  children?: ReactNode
}) {
  const intl = useAppIntl()
  return (
    <div className="intel-feed-tools">
      {children}
      {!showArchive && unread.length > 0 && (
        <button
          type="button"
          className="intel-feed-tool"
          onClick={() => onMarkAllRead(unread.map((s) => s.id))}
          title={intl.formatMessage({ id: 'intel.markAllHelp', defaultMessage: 'Mark every story here read' })}
        >
          <Check size={13} />
          {intl.formatMessage({ id: 'intel.markAll', defaultMessage: 'Mark all read' })}
          <span className="intel-feed-tool-count intel-feed-tool-count--accent">
            {unread.length}
          </span>
        </button>
      )}
      <button
        type="button"
        className={`intel-feed-tool intel-feed-tool--archive${showArchive ? ' intel-feed-tool--active' : ''}`}
        onClick={onToggleArchive}
        disabled={!archiveCount && !showArchive}
        title={intl.formatMessage({ id: 'intel.archivedHelp', defaultMessage: 'Dismissed and auto-resolved stories' })}
      >
        <Archive size={13} />
        {showArchive ? backLabel === 'Back' ? intl.formatMessage({ id: 'intel.back', defaultMessage: 'Back' }) : backLabel : intl.formatMessage({ id: 'intel.viewArchived', defaultMessage: 'View archived' })}
        <span className="intel-feed-tool-count">{archiveCount}</span>
      </button>
    </div>
  )
}

function ScanNote({ at }: { at: string | null }) {
  const intl = useAppIntl()
  return (
    <span
      className="intel-desk-scan"
      title={
        at
          ? intl.formatMessage({ id: 'intel.lastScan', defaultMessage: 'Last news scan: {date}' }, { date: fDateTime(at) })
          : intl.formatMessage({ id: 'intel.noScanHelp', defaultMessage: 'No news scan has run yet — press Scan, or wait for the schedule.' })
      }
    >
      {at ? intl.formatMessage({ id: 'intel.scannedAgo', defaultMessage: 'News scanned {time}' }, { time: intelTimeAgo(at, intl) }) : intl.formatMessage({ id: 'intel.notScanned', defaultMessage: 'News not scanned yet' })}
    </span>
  )
}

/** A ticker desk's status bar: a jump to the first story of each status, then the tools. */
export function DeskStatusBar({
  counts,
  unread,
  archiveCount,
  showArchive,
  onToggleArchive,
  onMarkAllRead,
  onFocusStory,
  newsScannedAt,
  toolbar,
}: {
  counts: Record<QueueStatus, StoryArc[]>
  unread: StoryArc[]
  archiveCount: number
  showArchive: boolean
  onToggleArchive: () => void
  onMarkAllRead: (ids: string[]) => void
  onFocusStory: (id: string) => void
  newsScannedAt?: string | null
  toolbar?: ReactNode
}) {
  const intl = useAppIntl()
  return (
    <div className="intel-desk-bar">
      <div className="intel-desk-status">
        {QUEUE_ORDER.map((k) =>
          counts[k].length ? (
            <button
              key={k}
              type="button"
              className="intel-desk-status-btn"
              onClick={() => onFocusStory(counts[k][0]!.id)}
              title={intl.formatMessage({ id: 'intel.jumpStatus', defaultMessage: 'Jump to the first \"{status}\" story' }, { status: queueLabel(k, intl, QUEUE_META[k].label) })}
            >
              <span
                className="intel-desk-line-dot"
                style={{ background: QUEUE_META[k].color }}
                aria-hidden
              />
              {counts[k].length} {queueLabel(k, intl, QUEUE_META[k].label).toLowerCase()}
            </button>
          ) : null,
        )}
        {counts.action_needed.length === 0 && (
          <span className="intel-desk-calm">
            <Check size={12} aria-hidden /> {intl.formatMessage({ id: 'intel.nothingNeedsDecision', defaultMessage: 'Nothing needs a decision' })}
          </span>
        )}
      </div>
      <FeedTools
        unread={unread}
        archiveCount={archiveCount}
        showArchive={showArchive}
        onToggleArchive={onToggleArchive}
        onMarkAllRead={onMarkAllRead}
      >
        {toolbar}
        {newsScannedAt !== undefined && <ScanNote at={newsScannedAt} />}
      </FeedTools>
    </div>
  )
}
