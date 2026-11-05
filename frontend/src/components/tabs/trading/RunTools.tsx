import { useTradingErrorText } from './useTradingErrorText'
import { useLayoutEffect, useRef, useState } from 'react'
import { tradingApi } from '../../../api/trading'
import type { TradingRun } from '../../../types/trading'
import {
  Button,
  Cluster,
  ErrorState,
  FormField,
  Modal,
  Stack,
  Text,
  TextArea,
  TextField,
} from '../../ui'
import { tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'

const template = `import json, sys
snapshot = json.load(sys.stdin)
# Inspect snapshot["environment"], snapshot["accounts"] and snapshot["observations"].
# Orders use account_id, instrument, side, quantity and a unique request_id.
print(json.dumps({"orders": [], "summary": "Observed the account; no trade yet."}))
`

export function RunTools({ run }: { run: TradingRun }) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const [dialog, setDialog] = useState<'agent' | 'script' | 'access' | null>(null)
  const [source, setSource] = useState(template)
  const [model, setModel] = useState('')
  const [access, setAccess] = useState<{
    token: string
    expires_at: string
    endpoint: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const accessGeneration = useRef(0)
  const dialogContent = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // Disabling the active action can move browser focus to body, outside the modal's
    // Escape boundary. Retain dialog focus without taking it from an exempt Lucius surface.
    const active = document.activeElement
    if (
      dialog &&
      (active === document.body ||
        (active instanceof HTMLButtonElement &&
          active.disabled &&
          dialogContent.current?.contains(active)))
    ) {
      dialogContent.current?.focus({ preventScroll: true })
    }
  }, [dialog, busy])
  async function perform(operation: () => Promise<unknown>, success: string) {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await operation()
      setMessage(success)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  function close() {
    accessGeneration.current += 1
    setDialog(null)
    setAccess(null)
    setError('')
    setMessage('')
  }
  return (
    <>
      <Cluster>
        {run.workspace_snapshot.agent_kind === 'lucius' && (
          <Button disabled={run.state !== 'running'} onClick={() => setDialog('agent')}>
            {formatMessage({ id: 'trading.runAgentNow', defaultMessage: 'Run agent now' })}
          </Button>
        )}
        <Button disabled={run.state !== 'running'} onClick={() => setDialog('script')}>
          {formatMessage({
            id: 'trading.runStrategyScript',
            defaultMessage: 'Run strategy script',
          })}
        </Button>
        <Button onClick={() => setDialog('access')}>
          {formatMessage({
            id: 'trading.externalAgentAccess',
            defaultMessage: 'External agent access',
          })}
        </Button>
      </Cluster>
      {dialog && (
        <Modal
          open
          onClose={close}
          title={
            dialog === 'agent'
              ? formatMessage({ id: 'trading.runLucius', defaultMessage: 'Run Lucius' })
              : dialog === 'script'
                ? formatMessage({
                    id: 'trading.runStrategyScript',
                    defaultMessage: 'Run strategy script',
                  })
                : formatMessage({
                    id: 'trading.externalAgentAccess',
                    defaultMessage: 'External agent access',
                  })
          }
          size="lg"
        >
          <div ref={dialogContent} tabIndex={-1}>
            <Stack gap="--space-4">
              {dialog === 'agent' && (
                <>
                  <Text>
                    {formatMessage({
                      id: 'trading.runDecisionDescription',
                      defaultMessage:
                        'Run one decision cycle against this run’s current observations and mandate.',
                    })}
                  </Text>
                  <FormField
                    label={formatMessage({ id: 'trading.model', defaultMessage: 'Model' })}
                    info={formatMessage({
                      id: 'trading.modelDefault',
                      defaultMessage: 'Leave blank to use the configured instance model.',
                    })}
                  >
                    <TextField
                      aria-label={formatMessage({ id: 'trading.model', defaultMessage: 'Model' })}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </FormField>
                  <Button
                    disabled={busy || run.state !== 'running'}
                    onClick={() =>
                      void perform(
                        () => tradingApi.agent(run.id, model),
                        formatMessage({
                          id: 'trading.decisionFinished',
                          defaultMessage:
                            'Decision cycle finished. Inspect Activity and Orders for results.',
                        }),
                      )
                    }
                  >
                    {busy
                      ? formatMessage({ id: 'trading.running', defaultMessage: 'Running…' })
                      : formatMessage({
                          id: 'trading.runDecision',
                          defaultMessage: 'Run decision cycle',
                        })}
                  </Button>
                </>
              )}
              {dialog === 'script' && (
                <>
                  <Text>
                    {formatMessage({
                      id: 'trading.scriptExplanation',
                      defaultMessage:
                        'Scripts run in an isolated container without host files or network access. Return normalized orders; the workspace validates each order before execution.',
                    })}
                  </Text>
                  <FormField
                    label={formatMessage({
                      id: 'trading.pythonSource',
                      defaultMessage: 'Python strategy source',
                    })}
                  >
                    <TextArea
                      aria-label={formatMessage({
                        id: 'trading.pythonSource',
                        defaultMessage: 'Python strategy source',
                      })}
                      mono
                      rows={14}
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    />
                  </FormField>
                  <Button
                    disabled={busy || run.state !== 'running' || !source.trim()}
                    onClick={() =>
                      void perform(
                        () => tradingApi.script(run.id, source),
                        formatMessage({
                          id: 'trading.scriptFinished',
                          defaultMessage:
                            'Script finished. Source, output and submitted orders are recorded in Activity.',
                        }),
                      )
                    }
                  >
                    {busy
                      ? formatMessage({ id: 'trading.executing', defaultMessage: 'Executing…' })
                      : formatMessage({
                          id: 'trading.executeStrategy',
                          defaultMessage: 'Execute strategy',
                        })}
                  </Button>
                </>
              )}
              {dialog === 'access' && (
                <>
                  <Text>
                    {formatMessage({
                      id: 'trading.credentialExplanation',
                      defaultMessage:
                        'A credential can access this run’s trading tools only. It cannot authorize live trading, change the mandate, or access other runs. The credential is shown once and is discarded when this dialog closes.',
                    })}
                  </Text>
                  {access ? (
                    <>
                      <FormField
                        label={formatMessage({
                          id: 'trading.scopedCredential',
                          defaultMessage: 'Scoped credential',
                        })}
                      >
                        <TextArea
                          aria-label={formatMessage({
                            id: 'trading.scopedCredential',
                            defaultMessage: 'Scoped credential',
                          })}
                          readOnly
                          value={access.token}
                        />
                      </FormField>
                      <Text>
                        {formatMessage(
                          { id: 'trading.endpoint', defaultMessage: 'Endpoint: {endpoint}' },
                          { endpoint: access.endpoint },
                        )}
                      </Text>
                      <Text>
                        {formatMessage(
                          { id: 'trading.expires', defaultMessage: 'Expires: {time}' },
                          { time: tradingTime(access.expires_at) },
                        )}
                      </Text>
                      <Button
                        onClick={() =>
                          void perform(
                            () => navigator.clipboard.writeText(access.token),
                            formatMessage({
                              id: 'trading.credentialCopied',
                              defaultMessage: 'Credential copied.',
                            }),
                          )
                        }
                      >
                        {formatMessage({
                          id: 'trading.copyCredential',
                          defaultMessage: 'Copy credential',
                        })}
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void perform(
                          async () => {
                            const generation = accessGeneration.current
                            const result = await tradingApi.issueAccess(run.id)
                            if (generation === accessGeneration.current) setAccess(result)
                          },
                          formatMessage({
                            id: 'trading.credentialIssued',
                            defaultMessage:
                              'Credential issued. Store it securely before closing this dialog.',
                          }),
                        )
                      }
                    >
                      {formatMessage({
                        id: 'trading.issueCredential',
                        defaultMessage: 'Issue run credential',
                      })}
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      void perform(
                        async () => {
                          await tradingApi.revokeAccess(run.id)
                          setAccess(null)
                        },
                        formatMessage({
                          id: 'trading.credentialsRevoked',
                          defaultMessage: 'Run credentials revoked.',
                        }),
                      )
                    }
                  >
                    {formatMessage({
                      id: 'trading.revokeAccess',
                      defaultMessage: 'Revoke run access',
                    })}
                  </Button>
                </>
              )}
              {error && <ErrorState message={error} />}{' '}
              {message && (
                <Text as="p" tone="good">
                  {message}
                </Text>
              )}
            </Stack>
          </div>
        </Modal>
      )}
    </>
  )
}
