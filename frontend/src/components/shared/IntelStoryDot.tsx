import { useAppIntl } from '../../i18n/useAppIntl'
import type { TickerStories } from '../../hooks/useIntelStoryIndex'

// A small "N stories" marker on an Investments holding that has live Intel stories. It lives
// inside a clickable row, so it stops the click from also opening the asset page.
export function IntelStoryDot({
  stories,
  onOpen,
}: {
  stories: TickerStories | undefined
  onOpen: (storyId: string) => void
}) {
  const { formatMessage } = useAppIntl()
  if (!stories) return null
  const label = formatMessage(
    {
      id: 'shared.chart.storyLabel',
      defaultMessage:
        '{count, plural, one {# live Intel story} other {# live Intel stories}}{unread} — open in Intel',
    },
    {
      count: stories.count,
      unread: stories.unread
        ? formatMessage(
            { id: 'shared.chart.storyUnread', defaultMessage: ', {count} unread' },
            { count: stories.unread },
          )
        : '',
    },
  )
  return (
    <button
      type="button"
      className={`intel-story-dot${stories.unread ? ' intel-story-dot--unread' : ''}`}
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(stories.newestId)
      }}
    >
      {stories.count}
    </button>
  )
}
