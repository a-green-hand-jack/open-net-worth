import { useConnectorRelativeTime } from './useConnectorRelativeTime'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '../../../api/client'
import { Stack, Text, FormField, TextField, PasswordField, Select, useSecretReveal } from '../../ui'
import { unrevealed, useConnectorSave, useTouched } from './formSave'
import { revealConnectorSecret } from './secrets'

// Yodlee (Envestnet | Yodlee) aggregation connector config over /api/yodlee/*.
//
// Auth model: cobrand login (client_id + secret → cobrand session token) then
// user login (username + password + cobrand token → user session token). Both
// sessions are short-lived (~30min) and refreshed on every sync — the user never
// sees them.
//
// client_id is surfaced (not secret); a blank secret/password field leaves the
// saved value unchanged and the GET echoes only a `has_*` flag — the saved value
// is read back through each field's own eye (GET /api/connectors/yodlee/secret/
// {secret|password}). Save lives in the modal footer — see ./formSave.

interface YodleeStatus {
  configured: boolean
  enabled: boolean
  api_endpoint: string
  has_secret: boolean
  client_id: string
  has_user_credentials: boolean
  username: string
  last_synced_at: string | null
  last_status: string
  last_error: string | null
}

interface YodleeForm {
  client_id: string
  secret: string
  username: string
  password: string
  api_endpoint: string
}

/** The form as the server last returned it — both the seed for `load()` and the baseline
 *  the footer's Save compares against, so the two can never drift apart. */
function yodleeFormOf(c: YodleeStatus): YodleeForm {
  return {
    client_id: c.client_id || '',
    secret: '',
    username: c.username || '',
    password: '',
    api_endpoint: c.api_endpoint || 'sandbox',
  }
}

export function YodleeSection() {
  const { formatMessage } = useAppIntl()
  const relativeTime = useConnectorRelativeTime()
  const [cfg, setCfg] = useState<YodleeStatus | null>(null)
  const [form, setForm] = useState<YodleeForm | null>(null)
  const [error, setError] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  function load() {
    setError(false)
    authFetch('/api/yodlee/status')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((c: YodleeStatus) => {
        setCfg(c)
        setForm(yodleeFormOf(c))
      })
      .catch(() => setError(true))
  }

  useEffect(load, [])

  async function save(): Promise<boolean> {
    if (!form || !cfg) return false
    setSaving(true)
    setSaveErr(null)
    try {
      const body: Record<string, unknown> = {
        enabled: cfg.configured ? cfg.enabled : true,
        client_id: form.client_id.trim(),
        username: form.username.trim(),
        api_endpoint: form.api_endpoint,
      }
      if (form.secret.trim()) body.secret = form.secret.trim()
      if (form.password.trim()) body.password = form.password.trim()

      const r = await authFetch('/api/yodlee/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setSaveErr(d.detail || formatMessage({ id: 'connectors.alpaca.save', defaultMessage: 'Could not save the credentials.' }))
        return false
      }
      setForm((f) => f && { ...f, secret: '', password: '' })
      load()
      return true
    } catch {
      setSaveErr(formatMessage({ id: 'connectors.email.serverFailed', defaultMessage: 'Could not save — could not reach the server.' }))
      return false
    } finally {
      setSaving(false)
    }
  }

  const setSecret = useCallback((v: string) => setForm((f) => f && { ...f, secret: v }), [])
  const secretReveal = useSecretReveal({
    saved: !!cfg?.has_secret,
    value: form?.secret ?? '',
    onChange: setSecret,
    reveal: useCallback(() => revealConnectorSecret('yodlee', 'secret'), []),
  })

  const setPassword = useCallback((v: string) => setForm((f) => f && { ...f, password: v }), [])
  const passwordReveal = useSecretReveal({
    saved: !!cfg?.has_user_credentials,
    value: form?.password ?? '',
    onChange: setPassword,
    reveal: useCallback(() => revealConnectorSecret('yodlee', 'password'), []),
  })

  // Yodlee needs BOTH credential pairs to sync at all (mirrors `YodleeConfigStore.
  // is_configured`: has_secret = client_id + secret, has_user_credentials = username +
  // password). `api_endpoint` has a sane default ('sandbox') and isn't part of that gate, so
  // it stays optional. Typed fresh OR already-saved both count as valid, same as Email's
  // password.
  const clientIdValid = !form || !!form.client_id.trim()
  const secretValid = !form || !!form.secret.trim() || !!cfg?.has_secret
  const usernameValid = !form || !!form.username.trim()
  const passwordValid = !form || !!form.password.trim() || !!cfg?.has_user_credentials
  const clientIdTouched = useTouched()
  const secretTouched = useTouched()
  const usernameTouched = useTouched()
  const passwordTouched = useTouched()

  useConnectorSave({
    ready: !!form && !!cfg && clientIdValid && secretValid && usernameValid && passwordValid,
    values: form && {
      ...form,
      secret: unrevealed(form.secret, secretReveal),
      password: unrevealed(form.password, passwordReveal),
    },
    baseline: cfg ? yodleeFormOf(cfg) : form,
    saving,
    error: saveErr,
    save,
  })

  if (error) {
    return (
      <Text size="sm" tone="bad">
        {formatMessage({ id: 'connectors.yodlee.load', defaultMessage: 'Could not load the Yodlee connector status.' })}
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

  const set = <K extends keyof YodleeForm>(k: K, v: YodleeForm[K]) =>
    setForm((f) => f && { ...f, [k]: v })

  return (
    <Stack gap="--space-4">
      <Text size="sm" tone="faint">
        {formatMessage({ id: 'connectors.yodlee.intro', defaultMessage: "Enter your <link>Yodlee</link> cobrand API credentials and the Yodlee user account that holds the bank logins. Fetching and booking transactions is Lucius's job." }, { link: (chunks) => <a href="https://developer.envestnet.com/yodlee" target="_blank" rel="noreferrer">{chunks}</a> })}
      </Text>

      {cfg.configured && !cfg.enabled && (
        <Text size="xs" tone="warn">
          {formatMessage({ id: 'connectors.alpaca.paused', defaultMessage: "Currently paused — saving here won't resume it. Use Resume on the connector card to turn it back on." })}
        </Text>
      )}

      {cfg.configured && (
        <Text size="xs" tone="faint">
          {formatMessage({ id: 'connectors.yodlee.synced', defaultMessage: 'Last synced {time}' }, { time: relativeTime(cfg.last_synced_at) })}
        </Text>
      )}
      {cfg.configured && cfg.last_error && (
        <Text size="xs" tone="bad">
          {formatMessage({ id: 'connectors.email.lastError', defaultMessage: 'Last error: {error}' }, { error: cfg.last_error })}
        </Text>
      )}

      <Text size="sm" tone="ink" weight={600}>
        {formatMessage({ id: 'connectors.yodlee.cobrand', defaultMessage: 'Cobrand API credentials' })}
      </Text>

      <FormField
        label={formatMessage({ id: 'connectors.oauth.clientId', defaultMessage: 'Client ID' })}
        htmlFor="conn-yodlee-id"
        required
        help={formatMessage({ id: 'connectors.yodlee.idHelp', defaultMessage: 'Your Yodlee cobrand client ID (from the Yodlee developer portal).' })}
        error={clientIdTouched.touched && !clientIdValid ? formatMessage({ id: 'connectors.yodlee.idRequired', defaultMessage: "A client ID is required." }) : undefined}
      >
        <TextField
          id="conn-yodlee-id"
          value={form.client_id}
          placeholder="yodlee-client-id"
          onChange={(e) => set('client_id', e.target.value)}
          onBlur={clientIdTouched.onBlur}
        />
      </FormField>

      <FormField
        label={formatMessage({ id: 'connectors.yodlee.secret', defaultMessage: 'Client secret (cobrand password)' })}
        htmlFor="conn-yodlee-secret"
        required
        help={secretReveal.caption || formatMessage({ id: 'connectors.yodlee.secretHelp', defaultMessage: "Your Yodlee cobrand password." })}
        error={
          secretReveal.error ||
          (secretTouched.touched && !secretValid ? formatMessage({ id: 'connectors.yodlee.secretRequired', defaultMessage: "A cobrand secret is required." }) : undefined)
        }
      >
        <PasswordField
          id="conn-yodlee-secret"
          value={form.secret}
          placeholder={cfg.has_secret ? '••••••••' : formatMessage({ id: 'connectors.yodlee.secretPlaceholder', defaultMessage: "cobrand password" })}
          onChange={(e) => set('secret', e.target.value)}
          onBlur={secretTouched.onBlur}
          {...secretReveal.fieldProps}
        />
      </FormField>

      <Text size="sm" tone="ink" weight={600}>
        {formatMessage({ id: 'connectors.yodlee.userCredentials', defaultMessage: 'User account credentials' })}
      </Text>

      <FormField
        label={formatMessage({ id: 'connectors.yodlee.username', defaultMessage: 'Username (loginName)' })}
        htmlFor="conn-yodlee-user"
        required
        help={formatMessage({ id: 'connectors.yodlee.usernameHelp', defaultMessage: 'The Yodlee loginName for the linked user account (not secret).' })}
        error={
          usernameTouched.touched && !usernameValid
            ? formatMessage({ id: 'connectors.yodlee.usernameRequired', defaultMessage: "A username (loginName) is required." })
            : undefined
        }
      >
        <TextField
          id="conn-yodlee-user"
          value={form.username}
          placeholder="yodlee-login-name"
          onChange={(e) => set('username', e.target.value)}
          onBlur={usernameTouched.onBlur}
        />
      </FormField>

      <FormField
        label={formatMessage({ id: 'connectors.yodlee.password', defaultMessage: 'Password' })}
        htmlFor="conn-yodlee-pass"
        required
        help={passwordReveal.caption || formatMessage({ id: 'connectors.yodlee.passwordHelp', defaultMessage: "The password for the Yodlee user account." })}
        error={
          passwordReveal.error ||
          (passwordTouched.touched && !passwordValid ? formatMessage({ id: 'connectors.yodlee.passwordRequired', defaultMessage: "A password is required." }) : undefined)
        }
      >
        <PasswordField
          id="conn-yodlee-pass"
          value={form.password}
          placeholder={cfg.has_user_credentials ? '••••••••' : formatMessage({ id: 'connectors.yodlee.passwordPlaceholder', defaultMessage: "user password" })}
          onChange={(e) => set('password', e.target.value)}
          onBlur={passwordTouched.onBlur}
          {...passwordReveal.fieldProps}
        />
      </FormField>

      <FormField
        label={formatMessage({ id: 'connectors.yodlee.endpoint', defaultMessage: 'API endpoint' })}
        htmlFor="conn-yodlee-endpoint"
        help={formatMessage({ id: 'connectors.yodlee.endpointHelp', defaultMessage: 'Use Sandbox for development/testing; Production for live bank data.' })}
      >
        <Select
          id="conn-yodlee-endpoint"
          value={form.api_endpoint}
          onChange={(e) => set('api_endpoint', e.target.value)}
          options={[{ value: 'sandbox', label: formatMessage({ id: 'connectors.yodlee.sandbox', defaultMessage: 'Sandbox (developer testing)' }) }, { value: 'production', label: formatMessage({ id: 'connectors.yodlee.production', defaultMessage: 'Production (live data)' }) }]}
        />
      </FormField>

      {saveErr && (
        <Text size="xs" tone="bad">
          {saveErr}
        </Text>
      )}
    </Stack>
  )
}
