import type { IntlShape } from 'react-intl'

export const MODEL_ERROR_PARAMS: Record<string, string> = {
  'models.error.providerChoices': 'choices',
  'models.error.unknownProvider': 'provider',
  'models.error.disableDefault': 'provider',
  'models.error.removeDefaultKey': 'provider',
  'models.error.removeDefault': 'provider',
}

export function modelError(body: unknown, fallback: string, intl: IntlShape): string {
  if (!body || typeof body !== 'object') return fallback
  const problem = body as { detail?: unknown; message_id?: unknown; message_params?: unknown }
  const original = typeof problem.detail === 'string' ? problem.detail : fallback
  if (intl.locale === 'en' || typeof problem.message_id !== 'string') return original
  const field = MODEL_ERROR_PARAMS[problem.message_id]
  const params = problem.message_params
  if (!field || !params || typeof params !== 'object' || Array.isArray(params)) return original
  const values = params as Record<string, unknown>
  if (Object.keys(values).length !== 1 || typeof values[field] !== 'string') return original
  const { formatMessage } = intl
  const value = values[field] as string
  switch (problem.message_id) {
    case 'models.error.providerChoices':
      return formatMessage(
        {
          id: 'settings.remaining.modelErrorChoices',
          defaultMessage: 'Provider must be one of {choices}.',
        },
        { choices: value },
      )
    case 'models.error.unknownProvider':
      return formatMessage(
        {
          id: 'settings.remaining.modelErrorUnknown',
          defaultMessage: 'Unknown provider: {provider}.',
        },
        { provider: value },
      )
    case 'models.error.disableDefault':
      return formatMessage(
        {
          id: 'settings.remaining.modelErrorDisableDefault',
          defaultMessage:
            'Cannot disable {provider} while it is the active default. Set another default first.',
        },
        { provider: value },
      )
    case 'models.error.removeDefaultKey':
      return formatMessage(
        {
          id: 'settings.remaining.modelErrorRemoveKey',
          defaultMessage:
            'Cannot remove the API key for {provider} while it is the active default. Set another default first.',
        },
        { provider: value },
      )
    case 'models.error.removeDefault':
      return formatMessage(
        {
          id: 'settings.remaining.modelErrorRemoveDefault',
          defaultMessage:
            'Cannot remove {provider} while it is the active default. Set another default first.',
        },
        { provider: value },
      )
    default:
      return original
  }
}
