import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const messages = defineMessages({
  request_failed: { id: 'connectors.oauthError.requestFailed', defaultMessage: 'Could not start the sign-in — the request failed.' },
  status_unavailable: { id: 'connectors.oauthError.statusUnavailable', defaultMessage: 'Could not check the sign-in status.' },
  status_request_failed: { id: 'connectors.oauthError.statusFailed', defaultMessage: 'Could not check the sign-in status — the request failed.' },
  unsupported_transport: { id: 'connectors.oauthError.transport', defaultMessage: 'OAuth sign-in is only available for remote MCP servers.' },
  bad_request: { id: 'connectors.oauthError.request', defaultMessage: 'a url or server_id is required' },
  insecure_redirect: { id: 'connectors.oauthError.insecure', defaultMessage: 'Sign-in needs a secure address. Reach this instance over HTTPS, or from the machine it runs on.' },
  not_oauth: { id: 'connectors.oauthError.notOauth', defaultMessage: "This server didn't ask for a sign-in. Try None — it may not need credentials." },
  no_metadata: { id: 'connectors.oauthError.metadata', defaultMessage: "This server doesn't publish OAuth sign-in details, so we can't sign you in automatically. Use an API key if the vendor issues one." },
  no_registration: { id: 'connectors.oauthError.registration', defaultMessage: "This server needs an app registration we can't create automatically." },
  popup_blocked: { id: 'connectors.oauthError.popupBlocked', defaultMessage: 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.' },
  popup_closed: { id: 'connectors.oauthError.closed', defaultMessage: 'The sign-in window was closed before finishing.' },
  bad_response: { id: 'connectors.oauthError.response', defaultMessage: 'The sign-in could not be started.' },
  browser_launch_failed: { id: 'connectors.oauthError.browser', defaultMessage: 'Could not open your browser for sign-in. Try again.' },
})
export function useOAuthError() {
  const intl = useAppIntl()
  return (reason: string | null, fallback: string | null, status?: number) => reason === 'start_http' && status !== undefined ? intl.formatMessage({ id: 'connectors.oauthError.startHttp', defaultMessage: 'Could not start the sign-in ({status})' }, { status }) : reason && Object.hasOwn(messages, reason) ? intl.formatMessage(messages[reason as keyof typeof messages]) : fallback
}
