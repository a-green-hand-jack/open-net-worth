import type { IntlShape } from 'react-intl'

export type LifeEventSource =
  | 'preset_home'
  | 'default_event'
  | 'preset_baby'
  | 'preset_tuition'
  | 'preset_inheritance'
  | 'preset_sabbatical'

export interface LifeEventLabel {
  label: string
  labelSource?: LifeEventSource
}

export interface IncomeLabel {
  label: string
  labelSource?: 'default_income'
}

export function displayIncomeLabel(intl: IntlShape, stream: IncomeLabel): string {
  return stream.labelSource === 'default_income'
    ? intl.formatMessage({ id: 'plan.outlook.defaultIncome', defaultMessage: 'Income' })
    : stream.label
}

export function editedIncomeLabel<T extends IncomeLabel>(
  intl: IntlShape,
  stream: T,
  input: string,
  initialDisplay = displayIncomeLabel(intl, stream),
): T {
  if (input && input === initialDisplay) return stream
  if (!input) return { ...stream, label: 'Income', labelSource: 'default_income' }
  const copy = { ...stream, label: input }
  Reflect.deleteProperty(copy, 'labelSource')
  return copy
}

export function displayLifeEventLabel(intl: IntlShape, event: LifeEventLabel): string {
  const { formatMessage } = intl
  if (event.labelSource === 'preset_home')
    return formatMessage({ id: 'plan.outlook.defaultHome', defaultMessage: '🏠 Home' })
  if (event.labelSource === 'preset_baby')
    return formatMessage({ id: 'plan.outlook.defaultBaby', defaultMessage: '👶 New baby' })
  if (event.labelSource === 'preset_tuition')
    return formatMessage({ id: 'plan.outlook.defaultTuition', defaultMessage: '🎓 Tuition' })
  if (event.labelSource === 'preset_inheritance')
    return formatMessage({
      id: 'plan.outlook.defaultInheritance',
      defaultMessage: '💰 Inheritance',
    })
  if (event.labelSource === 'preset_sabbatical')
    return formatMessage({ id: 'plan.outlook.defaultSabbatical', defaultMessage: '✈️ Sabbatical' })
  if (event.labelSource === 'default_event')
    return formatMessage({ id: 'plan.outlook.defaultEvent', defaultMessage: 'Event' })
  return event.label
}

export function editedLifeEventLabel<T extends LifeEventLabel>(
  intl: IntlShape,
  event: T,
  input: string,
  initialDisplay = displayLifeEventLabel(intl, event),
): T {
  const label = input.trim()
  if (label && label === initialDisplay.trim()) return event
  if (!label) return { ...event, label: 'Event', labelSource: 'default_event' }
  const copy = { ...event, label }
  Reflect.deleteProperty(copy, 'labelSource')
  return copy
}
