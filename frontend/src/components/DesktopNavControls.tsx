import { ArrowLeft, ArrowRight, PanelLeft } from 'lucide-react'
import { Tooltip } from './ui/Tooltip'
import { useAppIntl } from '../i18n/useAppIntl'

interface Props {
  sidebarExpanded: boolean
  onToggleSidebar: () => void
  /** Pointer entered / left the toggle: drives the collapsed rail's hover peek. */
  onToggleHover?: () => void
  onToggleLeave?: () => void
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
}

// The macOS desktop window has no title bar: this cluster sits just right of the traffic lights
// (src/index.css, "macOS desktop shell"), the way native apps put sidebar + history controls.
export function DesktopNavControls({
  sidebarExpanded,
  onToggleSidebar,
  onToggleHover,
  onToggleLeave,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: Props) {
  const { formatMessage } = useAppIntl()
  const back = formatMessage({ id: 'shortcuts.back', defaultMessage: 'Back' })
  const forward = formatMessage({ id: 'shortcuts.forward', defaultMessage: 'Forward' })
  return (
    <div
      className="desktop-nav"
      role="toolbar"
      aria-label={formatMessage({ id: 'desktopNav.navigation', defaultMessage: 'Navigation' })}
    >
      <Tooltip
        label={
          sidebarExpanded
            ? formatMessage({ id: 'desktopNav.hideSidebar', defaultMessage: 'Hide sidebar' })
            : formatMessage({ id: 'desktopNav.showSidebar', defaultMessage: 'Show sidebar' })
        }
        shortcut={['Mod', 'B']}
      >
        <button
          className="desktop-nav-btn"
          onClick={onToggleSidebar}
          onMouseEnter={onToggleHover}
          onMouseLeave={onToggleLeave}
          aria-label={
            sidebarExpanded
              ? formatMessage({
                  id: 'desktopNav.collapseSidebar',
                  defaultMessage: 'Collapse sidebar',
                })
              : formatMessage({ id: 'desktopNav.expandSidebar', defaultMessage: 'Expand sidebar' })
          }
          aria-pressed={sidebarExpanded}
        >
          <PanelLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip label={back} shortcut={['Mod', '[']}>
        <button
          className="desktop-nav-btn"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label={back}
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip label={forward} shortcut={['Mod', ']']}>
        <button
          className="desktop-nav-btn"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label={forward}
        >
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  )
}
