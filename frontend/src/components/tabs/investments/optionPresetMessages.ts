import { defineMessages } from 'react-intl'

export const presetMessages = defineMessages({
  covered_call: { id: 'recordOption.preset.covered_call', defaultMessage: 'Covered call' },
  csp: { id: 'recordOption.preset.csp', defaultMessage: 'Cash-secured put' },
  long_call: { id: 'recordOption.preset.long_call', defaultMessage: 'Long call' },
  long_put: { id: 'recordOption.preset.long_put', defaultMessage: 'Long put' },
  protective_put: { id: 'recordOption.preset.protective_put', defaultMessage: 'Protective put' },
  custom: { id: 'recordOption.preset.custom', defaultMessage: 'Custom' },
})
