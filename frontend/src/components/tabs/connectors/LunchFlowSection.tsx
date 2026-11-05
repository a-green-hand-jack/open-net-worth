import { formatConnectorBody } from './connectorServerMessages'
import { useOAuthError } from './useOAuthError'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Stack,
  Cluster,
  Text,
  Button,
  FormField,
  TextField,
  PasswordField,
  useSecretReveal,
} from '../../ui'
import { unrevealed, useConnectorSave, useTouched } from './formSave'
import { revealConnectorSecret } from './secrets'
import {
  fetchLunchFlowStatus,
  updateLunchFlowConfig,
  disconnectLunchFlowConnection,
  type LunchFlowStatus,
} from './lunchFlowApi'
import { startLunchFlowOAuth, type LunchFlowOAuthHandle } from './lunchFlowOAuth'
import { ConnectorStatusLine } from './ConnectorStatusLine'
import { ConnectorAccountsList } from './ConnectorAccountsList'

// Lunch Flow connector config over /api/lunch-flow/* — mirrors PlaidSection's shape more than
// a paste-a-token form (SimpleFinSection/LunchMoneySection), since Lunch Flow is an OAuth
// PLATFORM: the owner's own developer client_id/secret pair (from lunchflow.app's own
// dashboard) plus a "Connect bank" button that opens Lunch Flow's hosted login+bank-link page
// in a popup and polls for the outcome (the same popup+poll shape the MCP OAuth sign-in flow
// established, reused here as its own connector-specific instance — see the connector's own
// ADR). The client secret is read back through its own eye (GET
// /api/connectors/lunch_flow/secret/client_secret); the OAuth tokens stay write-only and are
// never revealed to the browser at all, not even behind an eye. This form owns the config
// fields (creds / email / enable) + Connect/Disconnect; fetching transactions is now Lucius's
// job via a template (see the connector page's Automate button) — the unified /api/connectors PATCH owns the
// card-header enable toggle. Save lives in the modal footer — see ./formSave.

interface LunchFlowForm {
  client_id: string
  client_secret: string
  email: string
}

/** The server's values as a form — the seed for `load()` AND the baseline the footer's Save
 *  compares against, so the two can never drift apart. */
function lunchFlowFormOf(c: LunchFlowStatus): LunchFlowForm {
  return {
    client_id: c.client_id || '',
    client_secret: '',
    email: c.email || '',
  }
}

export function LunchFlowSection() {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const oauthErrorText = useOAuthError()
  const [cfg, setCfg] = useState<LunchFlowStatus | null>(null)
  const [form, setForm] = useState<LunchFlowForm | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // Bank-link flow state.
  const [connecting, setConnecting] = useState(false)
  const [connectErr, setConnectErr] = useState<string | null>(null)
  const oauthHandleRef = useRef<LunchFlowOAuthHandle | null>(null)

  const [disconnectingId, setDisconnectingId] = useState<number | null>(null)
  const [disconnectErr, setDisconnectErr] = useState<string | null>(null)

  function load() {
    setError(false)
    fetchLunchFlowStatus()
      .then((c) => {
        if (!c) throw new Error()
        setCfg(c)
        setForm(lunchFlowFormOf(c))
      })
      .catch(() => setError(true))
  }

  useEffect(load, [])

  // A running sign-in must not keep polling after the form navigates away.
  useEffect(() => () => oauthHandleRef.current?.cancel(), [])

  async function save(): Promise<boolean> {
    if (!form || !cfg) return false
    setSaving(true)
    setSaveErr(null)
    try {
      const body: Record<string, unknown> = {
        enabled: cfg.configured ? cfg.enabled : true,
        client_id: form.client_id.trim(),
        email: form.email.trim(),
      }
      if (form.client_secret.trim()) body.client_secret = form.client_secret.trim()
      const result = await updateLunchFlowConfig(body)
      if (!result.ok) {
        setSaveErr(result.fallback ? formatMessage({ id: 'connectors.alpaca.save', defaultMessage: 'Could not save the credentials.' }) : result.error)
        return false
      }
      setForm((f) => f && { ...f, client_secret: '' })
      load()
      return true
    } catch {
      setSaveErr(formatMessage({ id: 'connectors.email.serverFailed', defaultMessage: 'Could not save — could not reach the server.' }))
      return false
    } finally {
      setSaving(false)
    }
  }

  function connectBank() {
    oauthHandleRef.current?.cancel()
    setConnecting(true)
    setConnectErr(null)
    oauthHandleRef.current = startLunchFlowOAuth((outcome) => {
      oauthHandleRef.current = null
      setConnecting(false)
      if (!outcome.ok) {
        setConnectErr(oauthErrorText(outcome.reason ?? null, outcome.error, outcome.status) || formatMessage({ id: 'connectors.lunchFlow.signInFailed', defaultMessage: 'Sign-in did not complete.' }))
        return
      }
      load()
    })
  }

  function cancelConnect() {
    oauthHandleRef.current?.cancel()
    oauthHandleRef.current = null
    setConnecting(false)
  }

  async function disconnect(connectionId: number, institutionName: string) {
    // One click here fires DELETE at Lunch Flow itself — an irreversible external action
    // (the vendor unlinks the institution; imported transactions stay in the ledger either
    // way). Every other irreversible control in this app confirms first (e.g.
    // StatementsSection's delete), so this does too.
    const label = institutionName || formatMessage({ id: 'connectors.plaidBanks.thisBank', defaultMessage: 'this bank' })
    if (
      !window.confirm(
        formatMessage({ id: 'connectors.lunchFlow.confirm', defaultMessage: "Disconnect {name}? This unlinks it at Lunch Flow — you'll need to reconnect it there to sync again. Transactions already imported stay in your ledger." }, { name: label }),
      )
    ) {
      return
    }
    setDisconnectingId(connectionId)
    setDisconnectErr(null)
    try {
      const result = await disconnectLunchFlowConnection(connectionId)
      if (!result.ok) {
        setDisconnectErr(result.fallback ? formatMessage({ id: 'connectors.lunchFlow.disconnectFailed', defaultMessage: 'Could not disconnect.' }) : formatConnectorBody(intl, { detail: result.error, message_id: result.message_id, message_params: result.message_params }, result.error))
        return
      }
      load()
    } finally {
      setDisconnectingId(null)
    }
  }

  const setClientSecret = useCallback(
    (v: string) => setForm((f) => f && { ...f, client_secret: v }),
    [],
  )
  const secret = useSecretReveal({
    saved: !!cfg?.has_credentials,
    value: form?.client_secret ?? '',
    onChange: setClientSecret,
    reveal: useCallback(() => revealConnectorSecret('lunch_flow', 'client_secret'), []),
  })

  const clientSecretValid = !form || !!form.client_secret.trim() || !!cfg?.has_credentials
  const clientSecretTouched = useTouched()

  useConnectorSave({
    ready: !!form && !!cfg && clientSecretValid,
    values: form && { ...form, client_secret: unrevealed(form.client_secret, secret) },
    baseline: cfg ? lunchFlowFormOf(cfg) : form,
    saving,
    error: saveErr,
    save,
  })

  if (error) {
    return (
      <Text size="sm" tone="bad">
        {formatMessage({ id: 'connectors.lunchFlow.load', defaultMessage: 'Could not load the Lunch Flow connector status.' })}
      </Text>
    )
  }
  if (!cfg || !form) {
    return (
      <Text size="sm" tone="faint">
        {formatMessage({ id: 'connectors.email.loading', defaultMessage: 'Loading…' })}
      </Text>
    )
  }

  const set = <K extends keyof LunchFlowForm>(k: K, v: LunchFlowForm[K]) =>
    setForm((f) => f && { ...f, [k]: v })

  return (
    <Stack gap="--space-4">
      <Text size="sm" tone="faint">
        {formatMessage({ id: 'connectors.lunchFlow.intro', defaultMessage: "Add your <link>Lunch Flow</link> developer client ID and secret, then connect a bank — you'll sign in at Lunch Flow's own hosted page in a new window and link your bank there. Fetching and booking transactions is Lucius's job — automate it with a template below." }, { link: (chunks) => <a href="https://lunchflow.app/developer" target="_blank" rel="noreferrer">{chunks}</a> })}
      </Text>

      {cfg.configured && !cfg.enabled && (
        <Text size="xs" tone="warn">
          {formatMessage({ id: 'connectors.alpaca.paused', defaultMessage: "Currently paused — saving here won't resume it. Use Resume on the connector card to turn it back on." })}
        </Text>
      )}

      <ConnectorStatusLine lastSyncedAt={cfg.last_synced_at} lastStatus={cfg.last_status} />
      {cfg.last_error && (
        <Text size="xs" tone="bad">
          {formatMessage({ id: 'connectors.email.lastError', defaultMessage: 'Last error: {error}' }, { error: cfg.last_error })}
        </Text>
      )}
      {/* Always rendered regardless of last_status — a caution about the amount sign must
          stay visible even on a technically-"ok" fetch, or it goes unseen (security review). */}
      {cfg.last_caution && (
        <Text size="xs" tone="warn">
          {formatMessage({ id: 'connectors.lunchFlow.caution', defaultMessage: 'Caution: {caution}' }, { caution: cfg.last_caution })}
        </Text>
      )}

      <FormField
        label={formatMessage({ id: 'connectors.oauth.clientId', defaultMessage: 'Client ID' })}
        htmlFor="conn-lunchflow-id"
        required
        help={formatMessage({ id: 'connectors.lunchFlow.idHelp', defaultMessage: 'Your Lunch Flow client_id (from the Lunch Flow developer dashboard).' })}
      >
        <TextField
          id="conn-lunchflow-id"
          value={form.client_id}
          placeholder="lf_client_..."
          onChange={(e) => set('client_id', e.target.value)}
        />
      </FormField>

      <FormField
        label={formatMessage({ id: 'connectors.lunchFlow.secret', defaultMessage: 'Client secret' })}
        htmlFor="conn-lunchflow-secret"
        required
        help={secret.caption || formatMessage({ id: 'connectors.lunchFlow.secretHelp', defaultMessage: "Your Lunch Flow client_secret for that same app." })}
        error={
          secret.error ||
          (clientSecretTouched.touched && !clientSecretValid
            ? formatMessage({ id: 'connectors.lunchFlow.secretRequired', defaultMessage: "A client secret is required." })
            : undefined)
        }
      >
        <PasswordField
          id="conn-lunchflow-secret"
          value={form.client_secret}
          placeholder={cfg.has_credentials ? '••••••••' : formatMessage({ id: 'connectors.lunchFlow.secretPlaceholder', defaultMessage: "client secret" })}
          onChange={(e) => set('client_secret', e.target.value)}
          onBlur={clientSecretTouched.onBlur}
          {...secret.fieldProps}
        />
      </FormField>

      <FormField
        label={formatMessage({ id: 'connectors.lunchFlow.email', defaultMessage: 'Email' })}
        htmlFor="conn-lunchflow-email"
        help={formatMessage({ id: 'connectors.lunchFlow.emailHelp', defaultMessage: "Optional — pre-fills your email on Lunch Flow's sign-in page." })}
      >
        <TextField
          id="conn-lunchflow-email"
          type="email"
          value={form.email}
          placeholder="you@example.com"
          onChange={(e) => set('email', e.target.value)}
        />
      </FormField>

      {saveErr && (
        <Text size="xs" tone="bad">
          {saveErr}
        </Text>
      )}

      {/* ── Bank link flow (Lunch Flow hosted sign-in, popup + poll) ── */}
      <Stack gap="--space-3">
        <Text size="sm" tone="ink">
          {cfg.has_link ? formatMessage({ id: 'connectors.gcBanks.linkedBank', defaultMessage: "Linked bank" }) : formatMessage({ id: 'connectors.lunchFlow.connectBankHeading', defaultMessage: "Connect a bank" })}
        </Text>
        {connecting ? (
          <Cluster gap="--space-3" align="center">
            <Text size="xs" tone="faint">
              {formatMessage({ id: 'connectors.oauth.waiting', defaultMessage: 'Waiting for sign-in…' })}
            </Text>
            <Button size="sm" variant="secondary" onClick={cancelConnect}>
              {formatMessage({ id: 'connectors.action.cancel', defaultMessage: 'Cancel' })}
            </Button>
          </Cluster>
        ) : (
          <Cluster gap="--space-3" align="center" wrap>
            <Button size="sm" disabled={!cfg.has_credentials} onClick={connectBank}>
              {cfg.has_link ? formatMessage({ id: 'connectors.lunchFlow.reconnectBank', defaultMessage: "Reconnect bank" }) : formatMessage({ id: 'connectors.lunchFlow.connectBank', defaultMessage: "Connect bank" })}
            </Button>
            <Text size="xs" tone="faint">
              {formatMessage({ id: 'connectors.lunchFlow.hosted', defaultMessage: "Opens Lunch Flow's hosted sign-in in a new window." })}
            </Text>
          </Cluster>
        )}

        {connectErr && (
          <Text size="xs" tone="bad">
            {connectErr}
          </Text>
        )}
      </Stack>

      {/* ── Linked institutions (one row per Lunch Flow connection, with a Disconnect) ── */}
      {cfg.connections.length > 0 && (
        <Stack gap="--space-2">
          <Text size="sm" tone="ink">
            {formatMessage({ id: 'connectors.lunchFlow.institutions', defaultMessage: 'Linked institutions' })}
          </Text>
          {cfg.connections.map((conn) => (
            <Cluster key={conn.connection_id} gap="--space-3" align="center" wrap justify="between">
              <Text size="xs" tone="faint">
                {conn.institution_name || formatMessage({ id: 'connectors.lunchFlow.connection', defaultMessage: 'Connection {id}' }, { id: conn.connection_id })} •{' '}
                {formatMessage({ id: 'connectors.lunchFlow.accounts', defaultMessage: '{count} {count, plural, one {account} other {accounts}}' }, { count: conn.accounts.length })}
              </Text>
              <Button
                size="sm"
                variant="secondary"
                loading={disconnectingId === conn.connection_id}
                onClick={() => disconnect(conn.connection_id, conn.institution_name)}
              >
                {formatMessage({ id: 'connectors.lunchFlow.disconnect', defaultMessage: 'Disconnect' })}
              </Button>
            </Cluster>
          ))}
          {disconnectErr && (
            <Text size="xs" tone="bad">
              {disconnectErr}
            </Text>
          )}
        </Stack>
      )}

      <ConnectorAccountsList provider="lunch_flow" providerLabel="Lunch Flow" />
    </Stack>
  )
}
