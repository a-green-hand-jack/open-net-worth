import { FormattedMessage } from './FormattedMessage'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useState } from 'react'
import { authFetch } from '../../api/client'
import { Button, FormField, Stack, Text, TextField } from '../ui'
import { errorDetail } from './WatchlistsSection'

export const MAX_USER_SOURCES = 20

// The news-source write choke's ValidationError messages are field-prefixed ("label: is
// required" / "url: 'ftp://...' is not a safe http(s) URL (...)") — mirrors
// WatchlistsSection.watchlistFieldError's routing convention, applied to this form's two fields.
export function sourceFieldError(detail: string): { field: 'label' | 'url' | null } {
  if (detail.startsWith('label')) return { field: 'label' }
  if (detail.startsWith('url')) return { field: 'url' }
  return { field: null }
}

interface Props {
  userCount: number
  onAdded: () => void
}

export function AddNewsSourceForm({ userCount, onAdded }: Props) {
  const intl = useAppIntl()
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [labelError, setLabelError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [genericError, setGenericError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const atCap = userCount >= MAX_USER_SOURCES

  async function submit() {
    setBusy(true)
    setLabelError(null)
    setUrlError(null)
    setGenericError(null)
    try {
      const res = await authFetch('/api/intel/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), url: url.trim() }),
      })
      if (!res.ok) {
        if (res.status === 422) {
          const detail = await errorDetail(res, intl.formatMessage({ id: 'intel.error.addFailed', defaultMessage: 'Could not add — try again.' }), intl)
          const { field } = sourceFieldError(detail)
          if (field === 'label') setLabelError(detail)
          else if (field === 'url') setUrlError(detail)
          // No field prefix (e.g. the 20-feed cap's "sources: at most 20...") — show the
          // server's verbatim detail, not the generic "try again" (it's permanent, not
          // retryable). errorDetail() already falls back to the hardcoded string when the
          // response carries no real detail, so this is never blank.
          else setGenericError(detail)
          return
        }
        setGenericError(intl.formatMessage({ id: 'intel.error.addFailed', defaultMessage: 'Could not add — try again.' }))
        return
      }
      setLabel('')
      setUrl('')
      onAdded()
    } catch {
      setGenericError(intl.formatMessage({ id: 'intel.error.addFailed', defaultMessage: 'Could not add — try again.' }))
    } finally {
      setBusy(false)
    }
  }

  if (atCap) {
    return (
      <Text size="sm" tone="muted">
        {<FormattedMessage id="intel.extra.ff1bffac" defaultMessage={"You’ve reached the limit of 20 feeds — remove one to add another."} />}
      </Text>
    )
  }

  return (
    <Stack gap="--space-4">
      <FormField label={intl.formatMessage({ id: "intel.field.27c760ec", defaultMessage: "Feed name" })} htmlFor="src-add-label" error={labelError}>
        <TextField
          id="src-add-label"
          value={label}
          placeholder={intl.formatMessage({ id: "intel.field.cf6c051e", defaultMessage: "e.g. Reuters Markets" })}
          invalid={!!labelError}
          onChange={(e) => {
            setLabel(e.target.value)
            if (labelError) setLabelError(null)
          }}
        />
      </FormField>
      <FormField
        label={intl.formatMessage({ id: "intel.field.5a77492d", defaultMessage: "Feed URL" })}
        htmlFor="src-add-url"
        error={urlError}
        help={
          urlError
            ? undefined
            : intl.formatMessage({ id: 'intel.sources.feedValidationHelp', defaultMessage: 'Must be a public http(s) RSS/Atom feed — Lucius checks it before saving.' })
        }
      >
        <TextField
          id="src-add-url"
          value={url}
          placeholder="https://example.com/feed.xml"
          invalid={!!urlError}
          onChange={(e) => {
            setUrl(e.target.value)
            if (urlError) setUrlError(null)
          }}
        />
      </FormField>
      <Text size="xs" tone="muted">
        {<FormattedMessage id="intel.extra.09ed8e99" defaultMessage={"Lucius checks this feed on its own schedule, alongside your other sources."} />}
      </Text>
      {genericError && <div className="intel-wlc-add-err">{genericError}</div>}
      <Button
        variant="primary"
        size="sm"
        onClick={() => void submit()}
        disabled={!label.trim() || !url.trim() || busy}
      >
        {busy ? intl.formatMessage({ id: 'miss.feed.adding', defaultMessage: 'Adding…' }) : intl.formatMessage({ id: 'miss.feed.add', defaultMessage: 'Add feed' })}
      </Button>
    </Stack>
  )
}
