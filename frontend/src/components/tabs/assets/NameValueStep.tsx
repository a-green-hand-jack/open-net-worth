// "Name and value" — the create wizard's step 2: the two things net worth needs.
import { useId } from 'react'
import { fNum, getCurrencySymbol } from '../../../utils/format'
import { FormField, MoneyField, Stack, Text, TextField } from '../../ui'
import { TEXT_CAPS } from './api'
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { NameValueErrors } from './assetForms'

const placeholders = defineMessages({
  property: { id: 'assets.nameExample.property', defaultMessage: 'e.g. 88 Marina Rise' },
  vehicle: { id: 'assets.nameExample.vehicle', defaultMessage: 'e.g. 2022 Volvo XC60' },
  watch: { id: 'assets.nameExample.watch', defaultMessage: 'e.g. Rolex Submariner' },
  art: { id: 'assets.nameExample.art', defaultMessage: 'e.g. Tan Swie Hian painting' },
  metal: { id: 'assets.nameExample.metal', defaultMessage: 'e.g. Gold bars' },
  policy: { id: 'assets.nameExample.policy', defaultMessage: 'e.g. Great Eastern Endowment Plan' },
  other: { id: 'assets.nameExample.other', defaultMessage: 'e.g. Vintage camera collection' },
  fallback: { id: 'assets.nameExample.fallback', defaultMessage: 'Enter a recognizable name' },
})

export interface NameValueStepProps {
  category: string
  /** The category's own guidance (e.g. where gold ETFs belong), when it has some. */
  hint?: string
  name: string
  value: number | null
  /** The currency the value is typed in. */
  currency: string
  errors: NameValueErrors
  onName(name: string): void
  onValue(value: number | null): void
  /** A money field's text can't be read (true) or can again (false) — its owner must not save. */
  onUnreadable?(field: string, unreadable: boolean): void
}

export function NameValueStep({
  category,
  hint,
  name,
  value,
  currency,
  errors,
  onName,
  onValue,
  onUnreadable,
}: NameValueStepProps) {
  const intl = useAppIntl()
  const example = Object.hasOwn(placeholders, category)
    ? placeholders[category as keyof typeof placeholders]
    : placeholders.fallback
  const id = useId()
  return (
    <Stack gap="--space-6">
      {/* The category's own guidance leads the step, as step 4's intro does. */}
      {hint && (
        <Text as="p" size="sm" tone="muted">
          {hint}
        </Text>
      )}
      <FormField
        label={intl.formatMessage({ id: 'common.name', defaultMessage: 'Name' })}
        htmlFor={`${id}-name`}
        required
        error={errors.name}
      >
        <TextField
          id={`${id}-name`}
          autoFocus
          invalid={!!errors.name}
          value={name}
          maxLength={TEXT_CAPS.name}
          placeholder={intl.formatMessage(example)}
          onChange={(e) => onName(e.target.value)}
        />
      </FormField>
      <FormField
        label={
          category === 'policy'
            ? intl.formatMessage({
                id: 'assets.value.cashToday',
                defaultMessage: 'Cash value today',
              })
            : intl.formatMessage({ id: 'assets.value.worthToday', defaultMessage: 'Worth today' })
        }
        htmlFor={`${id}-value`}
        required
        help={
          category === 'policy'
            ? intl.formatMessage({
                id: 'assets.value.cashHelp',
                defaultMessage:
                  'The surrender value on your latest statement — not the sum assured.',
              })
            : intl.formatMessage({
                id: 'assets.value.estimate',
                defaultMessage: 'Your best estimate is fine',
              })
        }
        error={errors.value}
      >
        <MoneyField
          id={`${id}-value`}
          allowEmpty
          invalid={!!errors.value}
          prefix={getCurrencySymbol(currency)}
          value={value}
          formattedValue={value == null ? '' : fNum(value)}
          onValueChange={onValue}
          onInvalidChange={(bad) => onUnreadable?.('value', bad)}
        />
      </FormField>
    </Stack>
  )
}
