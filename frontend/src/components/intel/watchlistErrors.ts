import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'

export const messages = defineMessages({
  intentObject: { id: "watchlist.error.intentObject", defaultMessage: "Intent must be an object" },
  thesisLength: { id: "watchlist.error.thesisLength", defaultMessage: "Thesis is at most {limit} characters" },
  intentNumber: { id: "watchlist.error.intentNumber", defaultMessage: "{field} must be a number" },
  intentPositive: { id: "watchlist.error.intentPositive", defaultMessage: "{field} must be a positive price" },
  zoneMissing: { id: "watchlist.error.zoneMissing", defaultMessage: "Buy above requires buy below" },
  zoneOrder: { id: "watchlist.error.zoneOrder", defaultMessage: "Buy above must be below buy below" },
  blankName: { id: "watchlist.error.blankName", defaultMessage: "A watchlist name cannot be blank" },
  duplicateName: { id: "watchlist.error.duplicateName", defaultMessage: "A watchlist named {name} already exists" },
  listNotFound: { id: "watchlist.error.listNotFound", defaultMessage: "Watchlist {id} not found" },
  deleteManaged: { id: "watchlist.error.deleteManaged", defaultMessage: "My holdings is auto-managed and cannot be deleted" },
  chooseList: { id: "watchlist.error.chooseList", defaultMessage: "Choose or create a watchlist" },
  topicNoList: { id: "watchlist.error.topicNoList", defaultMessage: "Topics are followed, not kept in a watchlist" },
  alreadyFollowing: { id: "watchlist.error.alreadyFollowing", defaultMessage: "Already following {value}" },
  managedAdd: { id: "watchlist.error.managedAdd", defaultMessage: "My holdings mirrors your positions and cannot be edited manually; choose or create another watchlist" },
  symbolNotFound: { id: "watchlist.error.symbolNotFound", defaultMessage: "Could not find a stock or coin matching {symbol}. Check the symbol and try again." },
  alreadyInList: { id: "watchlist.error.alreadyInList", defaultMessage: "Already in this watchlist" },
  namedListNotFound: { id: "watchlist.error.namedListNotFound", defaultMessage: "Watchlist {name} does not exist" },
  managedEdit: { id: "watchlist.error.managedEdit", defaultMessage: "My holdings mirrors your positions and cannot be edited manually" },
  holdingsRemove: { id: "watchlist.error.holdingsRemove", defaultMessage: "This is one of your holdings. My holdings is auto-managed; remove it from your other watchlists instead." },
  itemNotFound: { id: "watchlist.error.itemNotFound", defaultMessage: "Not found" },
})
export const params: Record<string, string[]> = {"intentObject": [], "thesisLength": ["limit"], "intentNumber": ["field"], "intentPositive": ["field"], "zoneMissing": [], "zoneOrder": [], "blankName": [], "duplicateName": ["name"], "listNotFound": ["id"], "deleteManaged": [], "chooseList": [], "topicNoList": [], "alreadyFollowing": ["value"], "managedAdd": [], "symbolNotFound": ["symbol"], "alreadyInList": [], "namedListNotFound": ["name"], "managedEdit": [], "holdingsRemove": [], "itemNotFound": []}

export function localizeWatchlistError(body: unknown, intl: IntlShape): string | null {
  if (!body || typeof body !== 'object') return null
  const { message_id: id, message_params: values } = body as Record<string, unknown>
  if (typeof id !== 'string' || !id.startsWith('watchlist.error.')) return null
  const key = id.slice('watchlist.error.'.length)
  if (!Object.hasOwn(messages, key) || !Object.hasOwn(params, key)) return null
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null
  const input = values as Record<string, unknown>
  if (params[key]!.some(name => typeof input[name] !== 'string' && typeof input[name] !== 'number')) return null
  const field = input.field
  const localizedValues = (key === 'intentNumber' || key === 'intentPositive') && typeof field === 'string' && ['buy_above', 'buy_below', 'fair_value'].includes(field)
    ? { ...input, field: intl.formatMessage({ id: 'watchlist.error.intentField', defaultMessage: '{field, select, buy_above {buy_above} buy_below {buy_below} other {fair_value}}' }, { field }) }
    : input
  return intl.formatMessage(messages[key as keyof typeof messages] as MessageDescriptor, localizedValues as Record<string, string | number>)
}
