import { useCallback } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { authFetch } from '../../api/client'
import { setCachedQueryData } from '../../state/queryCache'
import { INTEL_SIGNALS_KEY } from '../../hooks/useIntelStoryIndex'
import type { ConfirmSpec } from './ConfirmDialog'
import { storyHeadline } from './storyMeta'
import type { StoryArc } from './storyMeta'

const patchStories = (fn: (prev: StoryArc[]) => StoryArc[]) =>
  setCachedQueryData<StoryArc[]>(INTEL_SIGNALS_KEY, (prev) => fn(prev ?? []))

const sendState = (id: string, body: Record<string, boolean>) =>
  authFetch(`/api/intel/signals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined)

function patchLocal(id: string, patch: Partial<StoryArc>) {
  patchStories((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
}

/** A story's lifecycle: read, dismiss, restore, delete. The server persists the flags; the cache
 *  is patched first for an instant response, then the poll (and a scan's reload) reconcile.
 *  PATCH/DELETE are fire-and-forget. */
export function useSignalActions(
  stories: StoryArc[],
  setConfirm: (spec: ConfirmSpec | null) => void,
) {
  const intl = useAppIntl()
  const markRead = useCallback((id: string) => {
    patchLocal(id, { read: true })
    void sendState(id, { read: true })
  }, [])
  const dismiss = useCallback((id: string) => {
    patchLocal(id, { dismissed: true, read: true })
    void sendState(id, { dismissed: true })
  }, [])
  const restore = useCallback((id: string) => {
    patchLocal(id, { dismissed: false, resolved: false, archived: false })
    void sendState(id, { dismissed: false, resolved: false })
  }, [])
  // Scoped to the stories the caller passes (one tab's) — reading My holdings must not silently
  // clear another tab's unread badge. One PATCH per story (the bulk endpoint marks the whole feed).
  const markAllRead = useCallback((ids: string[]) => {
    const set = new Set(ids)
    patchStories((prev) => prev.map((s) => (set.has(s.id) ? { ...s, read: true } : s)))
    for (const id of ids) void sendState(id, { read: true })
  }, [])
  const requestDelete = useCallback(
    (id: string) => {
      const s = stories.find((x) => x.id === id)
      setConfirm({
        title: intl.formatMessage({ id: 'intel.signal.deleteTitle', defaultMessage: 'Delete this signal permanently?' }),
        body: intl.formatMessage({ id: 'intel.signal.deleteBody', defaultMessage: "“{title}” will be removed from your history for good. This can't be undone." }, { title: s ? storyHeadline(s) : intl.formatMessage({ id: 'intel.signal.thisSignal', defaultMessage: 'This signal' }) }),
        confirmLabel: intl.formatMessage({ id: 'intel.signal.deleteForever', defaultMessage: 'Delete forever' }),
        onConfirm: async () => {
          patchStories((prev) => prev.filter((x) => x.id !== id))
          setConfirm(null)
          await authFetch(`/api/intel/signals/${id}`, { method: 'DELETE' }).catch(() => undefined)
        },
      })
    },
    [stories, setConfirm, intl],
  )
  return { markRead, dismiss, restore, markAllRead, requestDelete }
}
