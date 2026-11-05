import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const notes = defineMessages({
  gmail: { id: 'connectors.preset.gmail', defaultMessage: 'Enable IMAP in Gmail settings and use an App Password (Google account → Security).' },
  outlook: { id: 'connectors.preset.outlook', defaultMessage: 'Use an app password if your account has 2-step verification enabled.' },
  icloud: { id: 'connectors.preset.icloud', defaultMessage: 'iCloud requires an app-specific password (appleid.apple.com → Sign-In and Security).' },
  fastmail: { id: 'connectors.preset.fastmail', defaultMessage: 'Create an app password in Fastmail → Settings → Privacy & Security.' },
  slack: { id: 'connectors.preset.slack', defaultMessage: 'Create an Incoming Webhook in your Slack app → Incoming Webhooks, then paste its URL.' },
  discord: { id: 'connectors.preset.discord', defaultMessage: 'Channel → Edit → Integrations → Webhooks → New Webhook → Copy Webhook URL.' },
})
export function usePresetNote() {
  const intl = useAppIntl()
  return (key: string, fallback: string) => Object.hasOwn(notes, key) ? intl.formatMessage(notes[key as keyof typeof notes]) : fallback
}
