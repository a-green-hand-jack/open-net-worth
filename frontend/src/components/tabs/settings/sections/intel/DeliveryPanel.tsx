import { useAppIntl } from '../../../../../i18n/useAppIntl'
// Settings › Intelligence → What Intel should tell me: the person's own words that Lucius reads
// when deciding which news reaches them now, which waits for a roundup and which stays in the
// Intel tab. Shown only while the `intel_delivery_decider` experiment is on.
import { Panel } from '../../ds'
import type { PanelProps } from './fields'

export const DELIVERY_INSTRUCTIONS_MAX = 1000

export function DeliveryPanel({ cfg, save }: PanelProps) {
  const intl = useAppIntl()
  const saved = cfg.delivery_instructions ?? ''
  return (
    <Panel
      title={intl.formatMessage({ id: "intel.settings.8fac27eb", defaultMessage: "What Intel should tell me" })}
      sub={intl.formatMessage({ id: "intel.settings.6da848df", defaultMessage: "In your own words — e.g. 'Don't tell me about analyst upgrades. Not at night unless it's serious.' Lucius reads this each time it decides what reaches you." })}
    >
      <textarea
        className="rd-textarea"
        rows={4}
        maxLength={DELIVERY_INSTRUCTIONS_MAX}
        aria-label={intl.formatMessage({ id: "intel.settings.8fac27eb", defaultMessage: "What Intel should tell me" })}
        placeholder={intl.formatMessage({ id: "intel.settings.5c116f28", defaultMessage: "Don't tell me about analyst upgrades. Not at night unless it's serious." })}
        defaultValue={saved}
        key={saved}
        onBlur={(e) => {
          const next = e.target.value.trim()
          if (next !== saved) save({ delivery_instructions: next }, intl.formatMessage({ id: "intel.settings.3822fc21", defaultMessage: "Saved" }))
        }}
      />
    </Panel>
  )
}
