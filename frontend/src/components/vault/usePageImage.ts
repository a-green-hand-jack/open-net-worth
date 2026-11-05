import { useAppIntl } from '../../i18n/useAppIntl'
import { VaultRequestError } from '../../api/vault'
import { vaultError } from './vaultErrors'
import { useEffect, useState } from 'react'
import { authFetch } from '../../api/client'

// One page of a PDF item as an image the server drew (backend/services/document_preview.py),
// with the document's page count — shared by the compact preview and the full-size reader.

interface Loaded {
  key: string
  url?: string
  count?: number
  error?: unknown
}

export function usePageImage(itemId: string, page: number): Omit<Loaded, 'error'> & { loading: boolean; error?: string } {
  const intl = useAppIntl()
  const key = `${itemId}:${page}`
  const [loaded, setLoaded] = useState<Loaded>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    let url: string | undefined
    void (async () => {
      try {
        const res = await authFetch(
          `/api/vault/items/${encodeURIComponent(itemId)}/pages/${page}`,
          { signal: controller.signal },
        )
        if (!res.ok) {
          const json: unknown = await res.json().catch(() => ({}))
          const body = json && typeof json === 'object' && !Array.isArray(json) ? json as { detail?: unknown; message_id?: unknown; message_params?: unknown } : {}
          const detail = typeof body.detail === 'string' ? body.detail : `HTTP ${res.status}`
          setLoaded({ key, error: new VaultRequestError(detail, body) })
          return
        }
        url = URL.createObjectURL(await res.blob())
        setLoaded({ key, url, count: Number(res.headers.get('X-Page-Count')) || undefined })
      } catch (e) {
        if (!controller.signal.aborted) setLoaded({ key, error: e })
      }
    })()
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [itemId, page, key])
  return { ...loaded, error: loaded.error === undefined ? undefined : vaultError(loaded.error, intl), loading: loaded.key !== key }
}
