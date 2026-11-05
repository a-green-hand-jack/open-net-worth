import type { IntlShape } from 'react-intl'
import type { Automation } from '../../../api/automations'

/** The draft is not saved, so Lucius cannot look it up — include what the user typed. */
export function cadencePrompt(
  name: string,
  instructions: string,
  automation?: Automation,
  intl?: IntlShape,
) {
  if (!intl) {
    if (automation)
      return `Help me set a custom cadence for my automation “${automation.name}” (${automation.id}), then update its trigger.`
    return [
      'Help me set a custom cadence for a new automation I’m drafting. It isn’t saved yet — create it once we agree on the schedule.',
      `Name: ${name.trim() || 'untitled'}`,
      `What it should do: ${instructions.trim() || 'not written yet'}`,
    ].join('\n')
  }
  if (automation)
    return intl.formatMessage(
      {
        id: 'automations.cadence.existing',
        defaultMessage:
          'Help me set a custom cadence for my automation “{name}” ({id}), then update its trigger.',
      },
      { name: automation.name, id: automation.id },
    )
  return [
    intl.formatMessage({
      id: 'automations.cadence.new',
      defaultMessage:
        'Help me set a custom cadence for a new automation I’m drafting. It isn’t saved yet — create it once we agree on the schedule.',
    }),
    intl.formatMessage(
      { id: 'automations.cadence.name', defaultMessage: 'Name: {name}' },
      {
        name:
          name.trim() ||
          intl.formatMessage({ id: 'automations.cadence.untitled', defaultMessage: 'untitled' }),
      },
    ),
    intl.formatMessage(
      { id: 'automations.cadence.what', defaultMessage: 'What it should do: {instructions}' },
      {
        instructions:
          instructions.trim() ||
          intl.formatMessage({
            id: 'automations.cadence.notWritten',
            defaultMessage: 'not written yet',
          }),
      },
    ),
  ].join('\n')
}
