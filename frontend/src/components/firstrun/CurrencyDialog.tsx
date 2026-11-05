// The base-currency chooser for first run — the shared searchable picker, filled with the
// app's curated currency list. See PickDialog for why this is a modal and not a dropdown.

import { useMemo } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { PickDialog } from './PickDialog'
import { CURRENCY_OPTIONS } from './currencies'

export interface CurrencyDialogProps {
  value: string
  onPick: (code: string) => void
  onClose: () => void
}

export function CurrencyDialog({ value, onPick, onClose }: CurrencyDialogProps) {
  const { formatMessage, locale } = useAppIntl()
  const options = useMemo(
    () =>
      CURRENCY_OPTIONS.map((o) => {
        const [code = '', ...rest] = o.label.split(' — ')
        return {
          value: o.value,
          code,
          name:
            locale === 'en'
              ? rest.join(' — ')
              : (new Intl.DisplayNames([locale], { type: 'currency', fallback: 'none' }).of(code) ??
                rest.join(' — ')),
        }
      }),
    [locale],
  )

  return (
    <PickDialog
      title={formatMessage({ id: 'firstrun.currency.title', defaultMessage: 'App currency' })}
      subtitle={formatMessage({
        id: 'firstrun.currency.subtitle',
        defaultMessage: 'What your totals are shown in. Accounts can be in any currency.',
      })}
      searchPlaceholder={formatMessage({
        id: 'firstrun.currency.search',
        defaultMessage: 'Search by code or name\u2026',
      })}
      options={options}
      value={value}
      onPick={onPick}
      onClose={onClose}
      emptyLabel={formatMessage(
        { id: 'firstrun.currency.none', defaultMessage: 'No currency matches “{q}”.' },
        { q: '{q}' },
      )}
    />
  )
}
