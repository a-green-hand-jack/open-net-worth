import type { RunCreate, Allocation } from '../../../types/trading'
import { useAppIntl } from '../../../i18n/useAppIntl'
import {
  Button,
  Checkbox,
  Cluster,
  FormField,
  NumberField,
  Panel,
  Select,
  Stack,
  Text,
  TextArea,
  TextField,
} from '../../ui'

const localTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function DelegationEnvironment({
  value,
  onChange,
}: {
  value: RunCreate
  onChange: (value: RunCreate) => void
}) {
  const { formatMessage } = useAppIntl()
  const patch = (data: Partial<RunCreate>) => onChange({ ...value, ...data })
  const account = (index: number, data: Partial<Allocation>) =>
    patch({
      accounts: value.accounts.map((item, i) => (i === index ? { ...item, ...data } : item)),
    })
  return (
    <Stack gap="--space-4">
      <FormField
        label={formatMessage({ id: 'trading.environment', defaultMessage: 'Environment' })}
      >
        <Select
          aria-label={formatMessage({ id: 'trading.environment', defaultMessage: 'Environment' })}
          value={value.mode}
          onChange={(e) =>
            patch({ mode: e.target.value as RunCreate['mode'], live_authorized: false })
          }
          options={[
            {
              value: 'backtest',
              label: formatMessage({ id: 'trading.backtest', defaultMessage: 'Backtest' }),
            },
            {
              value: 'paper',
              label: formatMessage({ id: 'trading.paper', defaultMessage: 'Paper' }),
            },
            { value: 'live', label: formatMessage({ id: 'trading.live', defaultMessage: 'Live' }) },
          ]}
        />
      </FormField>
      <Cluster>
        <FormField label={formatMessage({ id: 'trading.start', defaultMessage: 'Start' })}>
          <TextField
            aria-label={formatMessage({ id: 'trading.start', defaultMessage: 'Start' })}
            type="datetime-local"
            required
            value={localTime(value.start_at)}
            onChange={(e) => {
              if (e.target.value) patch({ start_at: new Date(e.target.value).toISOString() })
            }}
          />
        </FormField>
        {value.end_at && (
          <FormField label={formatMessage({ id: 'trading.end', defaultMessage: 'End' })}>
            <TextField
              aria-label={formatMessage({ id: 'trading.end', defaultMessage: 'End' })}
              type="datetime-local"
              required
              value={localTime(value.end_at)}
              onChange={(e) => {
                if (e.target.value) patch({ end_at: new Date(e.target.value).toISOString() })
              }}
            />
          </FormField>
        )}
      </Cluster>
      {value.mode !== 'backtest' && (
        <Checkbox
          label={formatMessage({
            id: 'trading.continueUntilStopped',
            defaultMessage: 'Continue until stopped',
          })}
          checked={value.end_at === null}
          onChange={(e) =>
            patch({
              end_at: e.target.checked ? null : new Date(Date.now() + 30 * 86400000).toISOString(),
            })
          }
        />
      )}
      {value.mode === 'backtest' && !value.end_at && (
        <Button
          onClick={() => patch({ end_at: new Date(Date.now() + 30 * 86400000).toISOString() })}
        >
          {formatMessage({
            id: 'trading.setHistoricalEnd',
            defaultMessage: 'Set historical end date',
          })}
        </Button>
      )}
      {value.accounts.map((item, index) => (
        <Panel
          key={index}
          title={formatMessage(
            { id: 'trading.allocationNumber', defaultMessage: 'Allocation {number}' },
            { number: index + 1 },
          )}
          actions={
            value.accounts.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => patch({ accounts: value.accounts.filter((_, i) => i !== index) })}
              >
                {formatMessage(
                  { id: 'trading.removeAllocation', defaultMessage: 'Remove allocation {number}' },
                  { number: index + 1 },
                )}
              </Button>
            )
          }
        >
          <Stack gap="--space-4">
            <FormField
              label={formatMessage({ id: 'trading.accountLabel', defaultMessage: 'Account label' })}
            >
              <TextField
                aria-label={formatMessage(
                  { id: 'trading.accountLabelNumber', defaultMessage: 'Account label {number}' },
                  { number: index + 1 },
                )}
                required
                value={item.name}
                onChange={(e) => account(index, { name: e.target.value })}
              />
            </FormField>
            <Cluster>
              <FormField
                label={formatMessage({ id: 'trading.capital', defaultMessage: 'Capital' })}
              >
                <NumberField
                  aria-label={formatMessage(
                    {
                      id: 'trading.allocatedCapitalNumber',
                      defaultMessage: 'Allocated capital {number}',
                    },
                    { number: index + 1 },
                  )}
                  required
                  min={0.01}
                  step="any"
                  value={String(item.capital)}
                  onChange={(e) => account(index, { capital: e.target.value })}
                />
              </FormField>
              <FormField
                label={formatMessage({ id: 'trading.currency', defaultMessage: 'Currency' })}
              >
                <TextField
                  aria-label={formatMessage(
                    { id: 'trading.currencyNumber', defaultMessage: 'Currency {number}' },
                    { number: index + 1 },
                  )}
                  required
                  pattern="[A-Z]{3,8}"
                  value={item.currency}
                  onChange={(e) => account(index, { currency: e.target.value.toUpperCase() })}
                />
              </FormField>
              <FormField label={formatMessage({ id: 'trading.venue', defaultMessage: 'Venue' })}>
                <TextField
                  aria-label={formatMessage(
                    { id: 'trading.venueNumber', defaultMessage: 'Venue {number}' },
                    { number: index + 1 },
                  )}
                  required
                  value={item.venue}
                  onChange={(e) => account(index, { venue: e.target.value })}
                />
              </FormField>
            </Cluster>
            {value.mode === 'live' && (
              <>
                <FormField
                  label={formatMessage({
                    id: 'trading.brokerConnectorId',
                    defaultMessage: 'Broker connector ID',
                  })}
                >
                  <TextField
                    aria-label={formatMessage(
                      {
                        id: 'trading.brokerConnectorIdNumber',
                        defaultMessage: 'Broker connector ID {number}',
                      },
                      { number: index + 1 },
                    )}
                    required
                    value={item.connector_id ?? ''}
                    onChange={(e) => account(index, { connector_id: e.target.value })}
                  />
                </FormField>
                <FormField
                  label={formatMessage({
                    id: 'trading.dedicatedBrokerAccountId',
                    defaultMessage: 'Dedicated broker account ID',
                  })}
                >
                  <TextField
                    aria-label={formatMessage(
                      {
                        id: 'trading.dedicatedBrokerAccountIdNumber',
                        defaultMessage: 'Dedicated broker account ID {number}',
                      },
                      { number: index + 1 },
                    )}
                    required
                    value={item.broker_account_id ?? ''}
                    onChange={(e) => account(index, { broker_account_id: e.target.value })}
                  />
                </FormField>
                <FormField
                  label={formatMessage({
                    id: 'trading.bookAccountId',
                    defaultMessage: 'Book account ID',
                  })}
                >
                  <TextField
                    aria-label={formatMessage(
                      {
                        id: 'trading.bookAccountIdNumber',
                        defaultMessage: 'Book account ID {number}',
                      },
                      { number: index + 1 },
                    )}
                    value={item.book_account_id ?? ''}
                    onChange={(e) => account(index, { book_account_id: e.target.value })}
                  />
                </FormField>
              </>
            )}
          </Stack>
        </Panel>
      ))}
      <Button
        onClick={() =>
          patch({
            accounts: [
              ...value.accounts,
              {
                name: formatMessage({
                  id: 'trading.defaultAllocationName',
                  defaultMessage: 'Trading allocation',
                }),
                currency: value.base_currency,
                capital: '1000',
                venue: 'simulation',
              },
            ],
          })
        }
        disabled={value.accounts.length >= 20}
      >
        {formatMessage({ id: 'trading.addAllocation', defaultMessage: 'Add allocation' })}
      </Button>
      <details>
        <summary>
          {formatMessage({
            id: 'trading.dataCurrencySettings',
            defaultMessage: 'Data and currency settings',
          })}
        </summary>
        <Stack gap="--space-4">
          <FormField
            label={formatMessage({
              id: 'trading.reportingCurrency',
              defaultMessage: 'Reporting currency',
            })}
          >
            <TextField
              aria-label={formatMessage({
                id: 'trading.reportingCurrency',
                defaultMessage: 'Reporting currency',
              })}
              required
              pattern="[A-Z]{3,8}"
              value={value.base_currency}
              onChange={(e) => patch({ base_currency: e.target.value.toUpperCase() })}
            />
          </FormField>
          <FormField
            label={formatMessage({ id: 'trading.fxRatesJson', defaultMessage: 'FX rates (JSON)' })}
          >
            <TextArea
              aria-label={formatMessage({
                id: 'trading.fxRatesJson',
                defaultMessage: 'FX rates (JSON)',
              })}
              mono
              defaultValue={JSON.stringify(value.fx_rates)}
              onBlur={(e) => {
                try {
                  patch({ fx_rates: JSON.parse(e.target.value) })
                  e.target.setCustomValidity('')
                } catch {
                  e.target.setCustomValidity(
                    formatMessage({
                      id: 'trading.fxJsonInvalid',
                      defaultMessage: 'Enter valid JSON currency-to-base rates.',
                    }),
                  )
                }
              }}
            />
          </FormField>
          <Text size="sm" tone="muted">
            {formatMessage({
              id: 'trading.historicalObservations',
              defaultMessage:
                'Historical observations must be supplied with explicit timestamps and availability. Public market data is configured in the mandate.',
            })}
          </Text>
          <FormField
            label={formatMessage({
              id: 'trading.observationDataset',
              defaultMessage: 'Observation dataset (JSON)',
            })}
          >
            <TextArea
              aria-label={formatMessage({
                id: 'trading.observationDataset',
                defaultMessage: 'Observation dataset (JSON)',
              })}
              mono
              rows={5}
              defaultValue={JSON.stringify(value.observations)}
              onBlur={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  if (!Array.isArray(parsed)) throw new Error()
                  patch({ observations: parsed })
                  e.target.setCustomValidity('')
                } catch {
                  e.target.setCustomValidity(
                    formatMessage({
                      id: 'trading.observationsInvalid',
                      defaultMessage: 'Enter a JSON array of market observations.',
                    }),
                  )
                }
              }}
            />
          </FormField>
          <FormField
            label={formatMessage({
              id: 'trading.datasetVersion',
              defaultMessage: 'Dataset version',
            })}
          >
            <TextField
              aria-label={formatMessage({
                id: 'trading.datasetVersion',
                defaultMessage: 'Dataset version',
              })}
              required
              value={value.data_version}
              onChange={(e) => patch({ data_version: e.target.value })}
            />
          </FormField>
        </Stack>
      </details>
      {value.mode === 'live' && (
        <Text tone="warn">
          {formatMessage({
            id: 'trading.liveFundsWarning',
            defaultMessage:
              'Live trading uses real funds. Connection, account isolation, capabilities and permissions must pass before activation. You will explicitly authorize the reviewed allocation.',
          })}
        </Text>
      )}
    </Stack>
  )
}
