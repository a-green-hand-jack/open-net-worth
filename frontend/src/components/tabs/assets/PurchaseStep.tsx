// "How much did you pay?" (a policy: "How much have you paid in?") — the create wizard's optional
// step 4, reused verbatim by the asset page's Purchase editor. Controlled: the caller owns the
// value, the errors and the save.
import { useId } from 'react'
import { fNum, getCurrencySymbol } from '../../../utils/format'
import { DateField, FormField, MoneyField, Stack, Text } from '../../ui'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { PurchaseErrors, PurchaseValue } from './assetForms'

export type { PurchaseErrors, PurchaseValue } from './assetForms'

export interface PurchaseStepProps {
  category: string
  value: PurchaseValue
  /** One field's change — the owner merges it into its newest value (`withPurchase`). */
  onChange(patch: Partial<PurchaseValue>): void
  /** The currency the price is typed in. */
  currency: string
  /** The latest date that may be picked — today, as a local ISO date. */
  maxDate: string
  /** An existing asset's Purchase being edited — the intro drops "Optional". */
  editing?: boolean
  /** A money field's text can't be read (true) or can again (false) — its owner must not save. */
  onUnreadable?(field: string, unreadable: boolean): void
  errors: PurchaseErrors
}

export function PurchaseStep({
  category,
  value,
  onChange,
  currency,
  maxDate,
  errors,
  editing = false,
  onUnreadable,
}: PurchaseStepProps) {
  const { formatMessage } = useAppIntl()
  const id = useId()
  const policy = category === 'policy'
  const intro = policy
    ? editing
      ? formatMessage({
          id: 'assets.purchase.policyEditIntro',
          defaultMessage: "Shows whether the cash value is above what you've paid.",
        })
      : formatMessage({
          id: 'assets.purchase.policyIntro',
          defaultMessage: "Optional. Shows whether the cash value is above what you've paid.",
        })
    : editing
      ? formatMessage({
          id: 'assets.purchase.editIntro',
          defaultMessage: 'Adds your gain and yearly return.',
        })
      : formatMessage({
          id: 'assets.purchase.intro',
          defaultMessage: 'Optional — adds your gain and yearly return.',
        })
  return (
    <Stack gap="--space-6">
      <Text as="p" size="sm" tone="muted">
        {intro}
      </Text>
      <div className="as-form">
        <FormField
          label={
            policy
              ? formatMessage({
                  id: 'assets.sections.premiumsSoFar',
                  defaultMessage: 'Premiums paid so far',
                })
              : formatMessage({ id: 'assets.sections.boughtFor', defaultMessage: 'Bought for' })
          }
          htmlFor={`${id}-cost`}
          error={errors.cost}
        >
          <MoneyField
            id={`${id}-cost`}
            autoFocus
            invalid={!!errors.cost}
            allowEmpty
            prefix={getCurrencySymbol(currency)}
            value={value.cost}
            formattedValue={value.cost == null ? '' : fNum(value.cost)}
            onValueChange={(cost) => onChange({ cost })}
            onInvalidChange={(bad) => onUnreadable?.('cost', bad)}
          />
        </FormField>
        <FormField
          label={
            policy
              ? formatMessage({
                  id: 'assets.sections.policyStarted',
                  defaultMessage: 'Policy started on',
                })
              : formatMessage({ id: 'assets.sections.boughtOn', defaultMessage: 'Bought on' })
          }
          htmlFor={`${id}-date`}
          error={errors.cost_date}
        >
          <DateField
            id={`${id}-date`}
            invalid={!!errors.cost_date}
            max={maxDate}
            value={value.costDate}
            onChange={(e) => onChange({ costDate: e.target.value })}
          />
        </FormField>
      </div>
    </Stack>
  )
}
