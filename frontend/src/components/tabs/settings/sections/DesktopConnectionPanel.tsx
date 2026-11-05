import { useAppIntl } from '../../../../i18n/useAppIntl'
import { useState } from 'react'
import { desktopClientBridge } from '../../../../platform/desktop'
import { useQueryCache } from '../../../../state/queryCache'
import { ErrorState, Loading } from '../../../ui'
import { Btn, Panel, row } from '../ds'

const CONNECTION_KEY = 'native:desktop-connection'
const fetchConnection = () => {
  const client = desktopClientBridge()
  return client
    ? client.getConnection()
    : Promise.reject(new Error('Desktop connection is unavailable'))
}

export function DesktopConnectionPanel() {
  const { formatMessage } = useAppIntl()
  const client = desktopClientBridge()
  const connection = useQueryCache(CONNECTION_KEY, fetchConnection, { enabled: !!client })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<unknown>, failure: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  if (!client) return null
  const data = connection.data
  const displayError =
    error ??
    (connection.error
      ? formatMessage({
          id: 'settings.remaining.connectionLoadError',
          defaultMessage: 'Could not load the connection. Try again.',
        })
      : null)
  const server = data?.mode === 'server'
  return (
    <Panel
      title={formatMessage({ id: 'settings.remaining.connection', defaultMessage: 'Connection' })}
      sub={
        server
          ? formatMessage({
              id: 'settings.remaining.connectionServerHelp',
              defaultMessage:
                'Your book and scheduled work run on this server. Closing this app does not stop the server.',
            })
          : undefined
      }
    >
      {connection.initialLoading && !data && (
        <Loading
          label={formatMessage({
            id: 'settings.remaining.connectionLoading',
            defaultMessage: 'Loading connection…',
          })}
        />
      )}
      {displayError && (
        <ErrorState
          message={displayError}
          onRetry={() =>
            void run(
              connection.refresh,
              formatMessage({
                id: 'settings.remaining.connectionLoadError',
                defaultMessage: 'Could not load the connection. Try again.',
              }),
            )
          }
        />
      )}
      {data &&
        row(
          server
            ? formatMessage({
                id: 'settings.remaining.connectedServer',
                defaultMessage: 'Connected to server',
              })
            : formatMessage({
                id: 'settings.remaining.thisComputer',
                defaultMessage: 'This computer',
              }),
          server ? <span style={{ overflowWrap: 'anywhere' }}>{data.serverUrl}</span> : null,
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {server && (
              <Btn
                disabled={busy || !data.serverUrl}
                onClick={() =>
                  void run(
                    () => client.openBrowser(),
                    formatMessage({
                      id: 'settings.remaining.browserError',
                      defaultMessage: 'Could not open your browser. Try again.',
                    }),
                  )
                }
              >
                {formatMessage({
                  id: 'settings.remaining.openBrowser',
                  defaultMessage: 'Open in browser',
                })}
              </Btn>
            )}
            <Btn
              disabled={busy}
              onClick={() =>
                void run(
                  () => client.changeConnection(),
                  formatMessage({
                    id: 'settings.remaining.connectionChangeError',
                    defaultMessage: 'Could not change the connection. Try again.',
                  }),
                )
              }
            >
              {formatMessage({
                id: 'settings.remaining.changeConnection',
                defaultMessage: 'Change connection',
              })}
            </Btn>
          </div>,
        )}
    </Panel>
  )
}
