import { Modal } from './ui/Modal'
import { desktopBridge, desktopClientBridge } from '../platform/desktop'
import { isMacPlatform, shortcutKeys } from '../utils/shortcuts'
import { useAppIntl } from '../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'

interface Shortcut {
  label: string
  keys: readonly string[]
}

function everywhere(intl: IntlShape): Shortcut[] {
  return [
    {
      label: intl.formatMessage({ id: 'shortcuts.palette', defaultMessage: 'Command palette' }),
      keys: ['Mod', 'K'],
    },
    {
      label: intl.formatMessage({
        id: 'shortcuts.sidebar',
        defaultMessage: 'Show or hide the sidebar',
      }),
      keys: ['Mod', 'B'],
    },
    {
      label: intl.formatMessage({
        id: 'shortcuts.luciusPanel',
        defaultMessage: 'Show or hide the Lucius panel',
      }),
      keys: ['Mod', '/'],
    },
    {
      label: intl.formatMessage({ id: 'shortcuts.hideAmounts', defaultMessage: 'Hide amounts' }),
      keys: ['H'],
    },
    {
      label: intl.formatMessage({ id: 'shortcuts.title', defaultMessage: 'Keyboard shortcuts' }),
      keys: ['Mod', 'Shift', '/'],
    },
  ]
}

function desktopShortcuts(mac: boolean, intl: IntlShape): Shortcut[] {
  return [
    {
      label: intl.formatMessage({ id: 'shortcuts.openLucius', defaultMessage: 'Open Lucius' }),
      keys: ['Mod', 'L'],
    },
    {
      label: intl.formatMessage({
        id: 'shortcuts.newConversation',
        defaultMessage: 'New Lucius conversation',
      }),
      keys: ['Mod', 'N'],
    },
    {
      label: intl.formatMessage({
        id: 'shortcuts.newTransaction',
        defaultMessage: 'New transaction',
      }),
      keys: ['Mod', 'Shift', 'N'],
    },
    {
      label: intl.formatMessage({
        id: 'shortcuts.import',
        defaultMessage: 'Import statement or receipt',
      }),
      keys: ['Mod', 'O'],
    },
    {
      label: intl.formatMessage({ id: 'shortcuts.export', defaultMessage: 'Export book' }),
      keys: ['Mod', 'Shift', 'E'],
    },
    {
      label: intl.formatMessage({ id: 'shortcuts.settings', defaultMessage: 'Settings' }),
      keys: ['Mod', ','],
    },
    {
      label: intl.formatMessage({ id: 'shortcuts.back', defaultMessage: 'Back' }),
      keys: mac ? ['Mod', '['] : ['Alt', '←'],
    },
    {
      label: intl.formatMessage({ id: 'shortcuts.forward', defaultMessage: 'Forward' }),
      keys: mac ? ['Mod', ']'] : ['Alt', '→'],
    },
    {
      label: intl.formatMessage({
        id: 'shortcuts.mainScreen',
        defaultMessage: 'Go to a main screen, in sidebar order',
      }),
      keys: ['Mod', '1–8'],
    },
    {
      label: intl.formatMessage({ id: 'shortcuts.reload', defaultMessage: 'Reload' }),
      keys: ['Mod', 'R'],
    },
  ]
}

function Group({ title, rows }: { title: string; rows: Shortcut[] }) {
  return (
    <section className="shortcuts-group" aria-label={title}>
      <h3 className="shortcuts-group__title">{title}</h3>
      <ul className="shortcuts-list">
        {rows.map((row) => (
          <li key={row.label} className="shortcuts-row">
            <span>{row.label}</span>
            <span className="shortcuts-keys">
              {shortcutKeys(row.keys).map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The real shortcuts, listed from one place. The desktop group only appears inside the desktop
 *  app, whose native menu owns those keys. */
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const intl = useAppIntl()
  const desktop = Boolean(desktopBridge() ?? desktopClientBridge())
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={intl.formatMessage({ id: 'shortcuts.title', defaultMessage: 'Keyboard shortcuts' })}
      size="md"
    >
      <div className="shortcuts">
        <Group
          title={intl.formatMessage({ id: 'shortcuts.anywhere', defaultMessage: 'Anywhere' })}
          rows={everywhere(intl)}
        />
        {desktop && (
          <Group
            title={intl.formatMessage({ id: 'shortcuts.desktop', defaultMessage: 'Desktop app' })}
            rows={desktopShortcuts(isMacPlatform(), intl)}
          />
        )}
      </div>
    </Modal>
  )
}
