import { useAppIntl } from '../../../../i18n/useAppIntl'
import { Panel } from '../ds'

type ServiceCostRow = [label: string, cost: number, calls: number]

export function SearchFetchCostPanel({
  rows,
  formatCost,
  periodLabel,
}: {
  rows: ServiceCostRow[]
  formatCost: (value: number) => string
  periodLabel: string
}) {
  const { formatMessage } = useAppIntl()
  const total = rows.reduce((sum, [, cost]) => sum + cost, 0)

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.searchFetch',
        defaultMessage: 'Search & fetch',
      })}
      sub={formatMessage({
        id: 'settings.remaining.searchFetchHelp',
        defaultMessage: 'Estimated third-party API charges in the selected period',
      })}
      actions={
        <div className="rd-service-cost-total">
          <span>
            {formatMessage(
              {
                id: 'settings.remaining.estimatedTotal',
                defaultMessage: 'Estimated total · {period}',
              },
              { period: periodLabel },
            )}
          </span>
          <strong>{formatCost(total)}</strong>
        </div>
      }
    >
      {rows.length ? (
        <div className="rd-service-cost-table-wrap">
          <table className="rd-service-cost-table">
            <thead>
              <tr>
                <th scope="col">
                  {formatMessage({ id: 'settings.remaining.provider', defaultMessage: 'Provider' })}
                </th>
                <th scope="col">
                  {formatMessage({
                    id: 'settings.remaining.estimatedCost',
                    defaultMessage: 'Estimated cost',
                  })}
                </th>
                <th scope="col">
                  {formatMessage({ id: 'settings.remaining.calls', defaultMessage: 'Calls' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, cost, calls]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{formatCost(cost)}</td>
                  <td>
                    {formatMessage(
                      {
                        id: 'settings.remaining.callCount',
                        defaultMessage: '{count, plural, one {# call} other {# calls}}',
                      },
                      { count: calls },
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rd-service-cost-empty">
          {formatMessage({
            id: 'settings.remaining.noSearchCalls',
            defaultMessage: 'No search or fetch calls in this window.',
          })}
        </div>
      )}
    </Panel>
  )
}
