import type { IntlShape } from 'react-intl'

export interface ConnectorServerMessage {
  id: string
  params: Record<string, unknown>
}

/** Translate only explicitly identified application errors. Provider text stays verbatim. */
export function formatConnectorServerMessage(
  intl: IntlShape,
  message: ConnectorServerMessage | undefined,
  original: string,
): string {
  if (
    !message ||
    !message.params ||
    typeof message.params !== 'object' ||
    Array.isArray(message.params)
  )
    return original
  const keys = Object.keys(message.params)
  const { formatMessage } = intl
  if (message.id === 'connector.error.mcpDuplicate' || message.id === 'connector.error.mcpUnknown') {
    if (keys.length !== 1 || typeof message.params.server !== 'string') return original
    const server = message.params.server
    return message.id === 'connector.error.mcpDuplicate'
      ? formatMessage({ id: 'connector.error.mcpDuplicate', defaultMessage: 'mcp server already exists: {server}' }, { server })
      : formatMessage({ id: 'connector.error.mcpUnknown', defaultMessage: 'unknown mcp server: {server}' }, { server })
  }
  if (message.id === 'connector.error.unknown' || message.id === 'connector.error.alwaysOn') {
    if (keys.length !== 1 || typeof message.params.connector !== 'string') return original
    const connector = message.params.connector
    return message.id === 'connector.error.unknown'
      ? formatMessage(
          { id: 'connector.error.unknown', defaultMessage: 'unknown connector: {connector}' },
          { connector },
        )
      : formatMessage(
          {
            id: 'connector.error.alwaysOn',
            defaultMessage:
              "connector ''{connector}'' is always on and cannot be paused or resumed",
          },
          { connector },
        )
  }
  if (
    message.id === 'connector.error.fixedYahoo' ||
    message.id === 'connector.error.fixedCoinGecko'
  ) {
    if (keys.length !== 1 || typeof message.params.name !== 'string') return original
    const name = message.params.name
    return message.id === 'connector.error.fixedYahoo'
      ? formatMessage(
          {
            id: 'connector.error.fixedYahoo',
            defaultMessage:
              "{name} powers price lookups across the app and can't be removed. It holds no credentials of its own to clear.",
          },
          { name },
        )
      : formatMessage(
          {
            id: 'connector.error.fixedCoinGecko',
            defaultMessage:
              "{name} powers price lookups across the app and can't be removed. Use Edit configuration to change its saved API key instead.",
          },
          { name },
        )
  }
  if (keys.length) return original
  if (message.id === 'connector.error.plaidNotConfigured')
    return formatMessage({
      id: 'connector.error.plaidNotConfigured',
      defaultMessage: 'Plaid client_id / secret are not configured',
    })
  if (message.id === 'connector.error.plaidBankNotLinked')
    return formatMessage({
      id: 'connector.error.plaidBankNotLinked',
      defaultMessage: 'That bank is not linked',
    })
  if (message.id === 'connector.error.plaidNoLink')
    return formatMessage({
      id: 'connector.error.plaidNoLink',
      defaultMessage: 'Plaid did not return a hosted-link URL',
    })
  if (message.id === 'connector.error.plaidNoLinkProgress')
    return formatMessage({
      id: 'connector.error.plaidNoLinkProgress',
      defaultMessage: 'No Plaid link is in progress — click Link bank first',
    })
  if (message.id === 'connector.error.plaidPublicTokenRequired')
    return formatMessage({
      id: 'connector.error.plaidPublicTokenRequired',
      defaultMessage: 'public_token is required',
    })
  if (message.id === 'connector.error.plaidNoAccessToken')
    return formatMessage({
      id: 'connector.error.plaidNoAccessToken',
      defaultMessage: 'Plaid did not return an access token',
    })
  if (message.id === 'connector.error.plaidBankNameLong')
    return formatMessage({
      id: 'connector.error.plaidBankNameLong',
      defaultMessage: "Keep the bank's name under 80 characters",
    })
  if (message.id === 'connector.error.plaidRemoveFailed')
    return formatMessage({
      id: 'connector.error.plaidRemoveFailed',
      defaultMessage:
        "Couldn't reach Plaid to remove that bank — nothing changed. Try again in a moment.",
    })
  if (message.id === 'connector.error.plaidNotLinked')
    return formatMessage({
      id: 'connector.error.plaidNotLinked',
      defaultMessage: 'Plaid is not linked (no access token)',
    })
  if (message.id === 'connector.error.goCardlessNotConfigured')
    return formatMessage({ id: 'connector.error.goCardlessNotConfigured', defaultMessage: "GoCardless secret ID / secret key are not configured" })
  if (message.id === 'connector.error.goCardlessInvalidCountry')
    return formatMessage({ id: 'connector.error.goCardlessInvalidCountry', defaultMessage: "country must be a 2-letter ISO code (e.g. GB, DE, FR)" })
  if (message.id === 'connector.error.goCardlessInvalidRedirect')
    return formatMessage({ id: 'connector.error.goCardlessInvalidRedirect', defaultMessage: "redirect must be an http(s) URL" })
  if (message.id === 'connector.error.goCardlessInvalidInstitution')
    return formatMessage({ id: 'connector.error.goCardlessInvalidInstitution', defaultMessage: "institution_id must be a GoCardless bank id (e.g. ACME_BANK_GB)" })
  if (message.id === 'connector.error.goCardlessBankNotLinked')
    return formatMessage({ id: 'connector.error.goCardlessBankNotLinked', defaultMessage: "That bank is not linked" })
  if (message.id === 'connector.error.goCardlessNoBank')
    return formatMessage({ id: 'connector.error.goCardlessNoBank', defaultMessage: "No bank linked yet — choose a bank and select Link bank first" })
  if (message.id === 'connector.error.goCardlessRemoveFailed')
    return formatMessage({ id: 'connector.error.goCardlessRemoveFailed', defaultMessage: "Couldn't reach GoCardless to remove that bank — nothing changed. Try again in a moment." })
  if (message.id === 'connector.error.goCardlessNoLinkedBank')
    return formatMessage({ id: 'connector.error.goCardlessNoLinkedBank', defaultMessage: "No bank linked — link one in Connectors → GoCardless" })
  if (message.id === 'connector.error.enableCryptoRequired')
    return formatMessage({ id: 'connector.error.enableCryptoRequired', defaultMessage: "the cryptography package is required for Enable Banking" })
  if (message.id === 'connector.error.enableInvalidPrivateKey')
    return formatMessage({ id: 'connector.error.enableInvalidPrivateKey', defaultMessage: "the Enable Banking private key is not a valid PEM RSA key" })
  if (message.id === 'connector.error.enablePrivateKeyRSA')
    return formatMessage({ id: 'connector.error.enablePrivateKeyRSA', defaultMessage: "the Enable Banking private key must be an RSA key" })
  if (message.id === 'connector.error.enableNotConfigured')
    return formatMessage({ id: 'connector.error.enableNotConfigured', defaultMessage: "Enable Banking application_id / private_key are not configured" })
  if (message.id === 'connector.error.enableInvalidCountry')
    return formatMessage({ id: 'connector.error.enableInvalidCountry', defaultMessage: "country must be a 2-letter ISO code (e.g. FI, DE, FR)" })
  if (message.id === 'connector.error.enableBankRequired')
    return formatMessage({ id: 'connector.error.enableBankRequired', defaultMessage: "aspsp (bank) is required" })
  if (message.id === 'connector.error.enableNoConsentURL')
    return formatMessage({ id: 'connector.error.enableNoConsentURL', defaultMessage: "Enable Banking did not return a consent URL" })
  if (message.id === 'connector.error.enableCodeRequired')
    return formatMessage({ id: 'connector.error.enableCodeRequired', defaultMessage: "the authorization code is required" })
  if (message.id === 'connector.error.enableNoSession')
    return formatMessage({ id: 'connector.error.enableNoSession', defaultMessage: "Enable Banking did not return a session id" })
  if (message.id === 'connector.error.lunchFlowNotLinked')
    return formatMessage({ id: 'connector.error.lunchFlowNotLinked', defaultMessage: "Lunch Flow is not linked — connect a bank first." })
  if (message.id === 'connector.error.lunchFlowExpired')
    return formatMessage({ id: 'connector.error.lunchFlowExpired', defaultMessage: "Lunch Flow sign-in expired — reconnect the bank in Connectors." })
  if (message.id === 'connector.error.lunchFlowNoRefreshToken')
    return formatMessage({ id: 'connector.error.lunchFlowNoRefreshToken', defaultMessage: "Lunch Flow did not return a refreshed access token." })
  if (message.id === 'connector.error.enabledRequired')
    return formatMessage({
      id: 'connector.error.enabledRequired',
      defaultMessage: 'enabled is required',
    })
  if (message.id === 'connector.error.telegramStop')
    return formatMessage({
      id: 'connector.error.telegramStop',
      defaultMessage:
        'Could not confirm the Telegram bot stopped, so its credentials were NOT cleared — removing them first would risk a still-live bot losing its allowlist while it keeps running. Try again, or restart the app to force a clean stop.',
    })
  return original
}

export function formatConnectorBody(
  intl: IntlShape,
  body: { detail?: unknown; message_id?: unknown; message_params?: unknown },
  fallback: string,
): string {
  const original = typeof body.detail === 'string' && body.detail ? body.detail : fallback
  if (
    typeof body.message_id !== 'string' ||
    !body.message_params ||
    typeof body.message_params !== 'object' ||
    Array.isArray(body.message_params)
  )
    return original
  return formatConnectorServerMessage(
    intl,
    { id: body.message_id, params: body.message_params as Record<string, unknown> },
    original,
  )
}
