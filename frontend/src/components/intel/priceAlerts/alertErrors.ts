import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'

export const messages = defineMessages({
  tickerRequired: { id: "alert.error.tickerRequired", defaultMessage: "Ticker is required" },
  valueNumber: { id: "alert.error.valueNumber", defaultMessage: "Alert value must be a number" },
  valueFinite: { id: "alert.error.valueFinite", defaultMessage: "Alert value must be finite" },
  operator: { id: "alert.error.operator", defaultMessage: "Invalid alert operator" },
  kind: { id: "alert.error.kind", defaultMessage: "Invalid alert kind" },
  channels: { id: "alert.error.channels", defaultMessage: "Invalid alert channels" },
  nameLength: { id: "alert.error.nameLength", defaultMessage: "Alert name must be at most {limit} characters" },
  moveRange: { id: "alert.error.moveRange", defaultMessage: "Move threshold must be greater than zero and at most {max}" },
  cooldownInteger: { id: "alert.error.cooldownInteger", defaultMessage: "Cooldown must be a whole number" },
  cooldownRange: { id: "alert.error.cooldownRange", defaultMessage: "Cooldown must be between 0 and {max} minutes" },
  onTrigger: { id: "alert.error.onTrigger", defaultMessage: "Invalid action after triggering" },
  notFound: { id: "alert.error.notFound", defaultMessage: "Alert {id} not found" },
})
export const params: Record<string, string[]> = {"tickerRequired": [], "valueNumber": [], "valueFinite": [], "operator": [], "kind": [], "channels": [], "nameLength": ["limit"], "moveRange": ["max"], "cooldownInteger": [], "cooldownRange": ["max"], "onTrigger": [], "notFound": ["id"]}

export class AlertRequestError extends Error {
  readonly body: unknown
  constructor(message: string, body: unknown) { super(message); this.body = body }
}

export function alertErrorText(error: unknown, intl: IntlShape, fallback: string): string {
  if (!(error instanceof AlertRequestError)) return fallback
  if (!error.body || typeof error.body !== 'object') return error.message || fallback
  const { message_id: id, message_params: values } = error.body as Record<string, unknown>
  if (typeof id !== 'string' || !id.startsWith('alert.error.')) return error.message || fallback
  const key = id.slice('alert.error.'.length)
  if (!Object.hasOwn(messages, key) || !Object.hasOwn(params, key)) return error.message || fallback
  if (!values || typeof values !== 'object' || Array.isArray(values)) return error.message || fallback
  const input = values as Record<string, unknown>
  if (params[key]!.some(name => typeof input[name] !== 'string' && typeof input[name] !== 'number')) return error.message || fallback
  return intl.formatMessage(messages[key as keyof typeof messages] as MessageDescriptor, input as Record<string, string | number>)
}

export async function alertRequestError(res: Response): Promise<AlertRequestError> {
  try {
    const body: unknown = await res.json()
    const detail = body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string' ? body.detail : ''
    return new AlertRequestError(detail, body)
  } catch { return new AlertRequestError('', null) }
}
