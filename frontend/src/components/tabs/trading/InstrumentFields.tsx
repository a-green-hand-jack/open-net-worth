import type { TradingInstrument } from '../../../types/trading'
import { Button, Cluster, FormField, Panel, Select, Stack, TextField } from '../../ui'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function InstrumentFields({
  instruments,
  onChange,
}: {
  instruments: TradingInstrument[]
  onChange: (value: TradingInstrument[]) => void
}) {
  const { formatMessage } = useAppIntl()
  function update(index: number, patch: Partial<TradingInstrument>) {
    onChange(instruments.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }
  return (
    <Stack gap="--space-4">
      {instruments.map((item, index) => (
        <Panel
          title={formatMessage(
            { id: 'trading.instrumentNumber', defaultMessage: 'Instrument {number}' },
            { number: index + 1 },
          )}
          key={index}
          actions={
            <Button
              variant="ghost"
              onClick={() => onChange(instruments.filter((_, i) => i !== index))}
            >
              {formatMessage(
                { id: 'trading.removeInstrument', defaultMessage: 'Remove instrument {number}' },
                { number: index + 1 },
              )}
            </Button>
          }
        >
          <Stack gap="--space-4">
            <FormField label={formatMessage({ id: 'trading.symbol', defaultMessage: 'Symbol' })}>
              <TextField
                aria-label={formatMessage(
                  { id: 'trading.instrumentSymbol', defaultMessage: 'Instrument {number} symbol' },
                  { number: index + 1 },
                )}
                required
                maxLength={32}
                value={item.symbol}
                onChange={(e) => update(index, { symbol: e.target.value.toUpperCase() })}
              />
            </FormField>
            <FormField
              label={formatMessage({ id: 'trading.assetClass', defaultMessage: 'Asset class' })}
            >
              <Select
                aria-label={formatMessage(
                  {
                    id: 'trading.instrumentAssetClass',
                    defaultMessage: 'Instrument {number} asset class',
                  },
                  { number: index + 1 },
                )}
                value={item.asset_class}
                onChange={(e) =>
                  update(index, { asset_class: e.target.value as 'stock' | 'crypto' })
                }
                options={[
                  {
                    value: 'stock',
                    label: formatMessage({ id: 'trading.stock', defaultMessage: 'Stock' }),
                  },
                  {
                    value: 'crypto',
                    label: formatMessage({ id: 'trading.crypto', defaultMessage: 'Crypto' }),
                  },
                ]}
              />
            </FormField>
            <FormField label={formatMessage({ id: 'trading.venue', defaultMessage: 'Venue' })}>
              <TextField
                aria-label={formatMessage(
                  {
                    id: 'trading.instrumentVenueNumber',
                    defaultMessage: 'Instrument {number} venue',
                  },
                  { number: index + 1 },
                )}
                required
                value={item.venue}
                onChange={(e) => update(index, { venue: e.target.value })}
              />
            </FormField>
            <FormField
              label={formatMessage({
                id: 'trading.quoteCurrency',
                defaultMessage: 'Quote currency',
              })}
            >
              <TextField
                aria-label={formatMessage(
                  {
                    id: 'trading.instrumentCurrency',
                    defaultMessage: 'Instrument {number} currency',
                  },
                  { number: index + 1 },
                )}
                required
                pattern="[A-Z]{3,8}"
                value={item.currency}
                onChange={(e) => update(index, { currency: e.target.value.toUpperCase() })}
              />
            </FormField>
          </Stack>
        </Panel>
      ))}
      <Cluster>
        <Button
          onClick={() =>
            onChange([
              ...instruments,
              { symbol: '', asset_class: 'stock', venue: 'simulation', currency: 'USD' },
            ])
          }
        >
          {formatMessage({
            id: 'trading.addInstrument',
            defaultMessage: 'Add permitted instrument',
          })}
        </Button>
      </Cluster>
    </Stack>
  )
}
