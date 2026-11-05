// Settings → Chat. Split out of ModelSection (2026-08-25) — chat behavior isn't a model-routing
// decision; memory has its own section (MemorySection) since 2026-10-27.
import { PROFILE_KEY, fetchJson } from '../../../../hooks/serverState'
import {
  CHAT_COST_VISIBLE_CHANGED_EVENT,
  CHAT_THINKING_GROUPED_CHANGED_EVENT,
  CHAT_MULTI_TURN_CHANGED_EVENT,
  CHAT_SUGGESTIONS_CHANGED_EVENT,
  SCREEN_AWARENESS_DEFAULT_CHANGED_EVENT,
} from '../../../../hooks/useChatSuggestionsEnabled'
import { authFetch } from '../../../../api/client'
import { setCachedQueryData, useCachedFetchState } from '../../../../state/queryCache'
import { Panel, Toggle, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'
import { useAppIntl } from '../../../../i18n/useAppIntl'

export function ChatSection({ toast }: SectionProps) {
  const { formatMessage } = useAppIntl()
  // Follow-up suggestion chips. The control existed in Settings → Appearance before the port
  // (ChatSuggestionsPanel) and was dropped; the profile field, the hook and ChatPanel's consumer
  // all survived, so only the switch was missing.
  const suggestions = useCachedFetchState<{
    chat_suggestions_enabled?: boolean
    chat_cost_visible?: boolean
    chat_multi_turn_enabled?: boolean
    chat_thinking_grouped?: boolean
    screen_awareness_default?: boolean
  }>(
    PROFILE_KEY,
    () =>
      fetchJson<{
        chat_suggestions_enabled?: boolean
        chat_cost_visible?: boolean
        chat_multi_turn_enabled?: boolean
        chat_thinking_grouped?: boolean
        screen_awareness_default?: boolean
      }>(PROFILE_KEY),
    { staleTime: 0 },
  )

  useSectionBusy(suggestions.initialLoading && !suggestions.data)

  async function putScreenAwarenessDefault(enabled: boolean) {
    try {
      const response = await authFetch(PROFILE_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screen_awareness_default: enabled }),
      })
      if (!response.ok) {
        toast(
          formatMessage(
            { id: 'settings.chat.saveHttp', defaultMessage: 'Could not save (HTTP {status})' },
            { status: response.status },
          ),
        )
        return
      }
      const body = (await response.json()) as { profile?: unknown }
      setCachedQueryData(PROFILE_KEY, body.profile ?? body)
      window.dispatchEvent(new Event(SCREEN_AWARENESS_DEFAULT_CHANGED_EVENT))
      toast(
        enabled
          ? formatMessage({
              id: 'settings.chat.screenOn',
              defaultMessage: 'Screen awareness on by default',
            })
          : formatMessage({
              id: 'settings.chat.screenOff',
              defaultMessage: 'Screen awareness off by default',
            }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.chat.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function putCostVisible(visible: boolean) {
    try {
      const r = await authFetch(PROFILE_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_cost_visible: visible }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            { id: 'settings.chat.saveHttp', defaultMessage: 'Could not save (HTTP {status})' },
            { status: r.status },
          ),
        )
        return
      }
      const body = (await r.json()) as { profile?: unknown }
      setCachedQueryData(PROFILE_KEY, body.profile ?? body)
      window.dispatchEvent(new Event(CHAT_COST_VISIBLE_CHANGED_EVENT))
      toast(
        visible
          ? formatMessage({
              id: 'settings.chat.costShown',
              defaultMessage: 'Cost shown on each turn',
            })
          : formatMessage({ id: 'settings.chat.costHidden', defaultMessage: 'Cost hidden' }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.chat.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function putSuggestionsEnabled(enabled: boolean) {
    try {
      const r = await authFetch(PROFILE_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_suggestions_enabled: enabled }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            { id: 'settings.chat.saveHttp', defaultMessage: 'Could not save (HTTP {status})' },
            { status: r.status },
          ),
        )
        return
      }
      // PUT /api/profile answers {ok, profile} — caching the WRAPPER under PROFILE_KEY would
      // hand every other consumer of that key an object with no profile fields on it.
      const body = (await r.json()) as { profile?: unknown }
      setCachedQueryData(PROFILE_KEY, body.profile ?? body)
      // An already-open chat panel listens for this and reacts without a reload.
      window.dispatchEvent(new Event(CHAT_SUGGESTIONS_CHANGED_EVENT))
      toast(
        enabled
          ? formatMessage({
              id: 'settings.chat.suggestionsOn',
              defaultMessage: 'Follow-up suggestions on',
            })
          : formatMessage({
              id: 'settings.chat.suggestionsOff',
              defaultMessage: 'Follow-up suggestions off',
            }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.chat.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function putThinkingGrouped(grouped: boolean) {
    try {
      const r = await authFetch(PROFILE_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_thinking_grouped: grouped }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            { id: 'settings.chat.saveHttp', defaultMessage: 'Could not save (HTTP {status})' },
            { status: r.status },
          ),
        )
        return
      }
      const body = (await r.json()) as { profile?: unknown }
      setCachedQueryData(PROFILE_KEY, body.profile ?? body)
      window.dispatchEvent(new Event(CHAT_THINKING_GROUPED_CHANGED_EVENT))
      toast(
        grouped
          ? formatMessage({
              id: 'settings.chat.reasoningGrouped',
              defaultMessage: 'Reasoning shown as one block',
            })
          : formatMessage({
              id: 'settings.chat.reasoningSeparate',
              defaultMessage: 'Reasoning shown step by step',
            }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.chat.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function putMultiTurnEnabled(enabled: boolean) {
    try {
      const r = await authFetch(PROFILE_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_multi_turn_enabled: enabled }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            { id: 'settings.chat.saveHttp', defaultMessage: 'Could not save (HTTP {status})' },
            { status: r.status },
          ),
        )
        return
      }
      const body = (await r.json()) as { profile?: unknown }
      setCachedQueryData(PROFILE_KEY, body.profile ?? body)
      window.dispatchEvent(new Event(CHAT_MULTI_TURN_CHANGED_EVENT))
      toast(
        enabled
          ? formatMessage({ id: 'settings.chat.multiOn', defaultMessage: 'Multi-turn chat on' })
          : formatMessage({ id: 'settings.chat.multiOff', defaultMessage: 'One turn at a time' }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.chat.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  return (
    <Panel
      title={formatMessage({ id: 'settings.chat.title', defaultMessage: 'Chat' })}
      sub={formatMessage({
        id: 'settings.chat.subtitle',
        defaultMessage: 'How the assistant behaves in the chat panel',
      })}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {formatMessage({
              id: 'settings.chat.suggestions',
              defaultMessage: 'Follow-up suggestions',
            })}
          </div>
          <div className="rd-help" style={{ marginTop: 3, display: 'block', lineHeight: 1.5 }}>
            {formatMessage({
              id: 'settings.chat.suggestionsHelp',
              defaultMessage:
                'The suggested next questions under a reply. Off means none are generated — which also stops the model call that writes them.',
            })}
          </div>
        </div>
        <Toggle
          on={suggestions.data?.chat_suggestions_enabled === true}
          disabled={!suggestions.data}
          onChange={(v) => void putSuggestionsEnabled(v)}
          label={formatMessage({
            id: 'settings.chat.suggestions',
            defaultMessage: 'Follow-up suggestions',
          })}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {formatMessage({
              id: 'settings.chat.screenDefault',
              defaultMessage: 'Screen awareness by default',
            })}
          </div>
          <div className="rd-help" style={{ marginTop: 3, display: 'block', lineHeight: 1.5 }}>
            {formatMessage({
              id: 'settings.chat.screenHelp',
              defaultMessage:
                "On: the screen you're on goes along with each message. Off: it doesn't, but Lucius can still look if you ask. The switch above the message box changes it on that device.",
            })}
          </div>
        </div>
        <Toggle
          on={suggestions.data?.screen_awareness_default !== false}
          disabled={!suggestions.data}
          onChange={(v) => void putScreenAwarenessDefault(v)}
          label={formatMessage({
            id: 'settings.chat.screenDefault',
            defaultMessage: 'Screen awareness by default',
          })}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {formatMessage({ id: 'settings.chat.cost', defaultMessage: 'Show cost per turn' })}
          </div>
          <div className="rd-help" style={{ marginTop: 3, display: 'block', lineHeight: 1.5 }}>
            {formatMessage({
              id: 'settings.chat.costHelp',
              defaultMessage:
                'The token counts, price and model under each reply. Hiding it changes nothing about what is spent or recorded — the session total and Cost panel still show it.',
            })}
          </div>
        </div>
        <Toggle
          on={suggestions.data?.chat_cost_visible !== false}
          disabled={!suggestions.data}
          onChange={(v) => void putCostVisible(v)}
          label={formatMessage({ id: 'settings.chat.cost', defaultMessage: 'Show cost per turn' })}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {formatMessage({
              id: 'settings.chat.groupReasoning',
              defaultMessage: 'Group reasoning into one block',
            })}
          </div>
          <div className="rd-help" style={{ marginTop: 3, display: 'block', lineHeight: 1.5 }}>
            {formatMessage({
              id: 'settings.chat.groupHelp',
              defaultMessage:
                "Off: each round of reasoning appears where it happened, between the tool calls it led to. On: the whole turn's reasoning is merged into one block above the answer. Presentation only — the transcript records the rounds separately either way.",
            })}
          </div>
        </div>
        <Toggle
          on={suggestions.data?.chat_thinking_grouped === true}
          disabled={!suggestions.data}
          onChange={(v) => void putThinkingGrouped(v)}
          label={formatMessage({
            id: 'settings.chat.groupReasoning',
            defaultMessage: 'Group reasoning into one block',
          })}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {formatMessage({ id: 'settings.chat.multi', defaultMessage: 'Multi-turn chat' })}
          </div>
          <div className="rd-help" style={{ marginTop: 3, display: 'block', lineHeight: 1.5 }}>
            {formatMessage({
              id: 'settings.chat.multiHelp',
              defaultMessage:
                "Off: Send is disabled until Lucius finishes answering. On: you can send while Lucius is still answering, and it's woven into that same reply.",
            })}
          </div>
        </div>
        <Toggle
          on={suggestions.data?.chat_multi_turn_enabled === true}
          disabled={!suggestions.data}
          onChange={(v) => void putMultiTurnEnabled(v)}
          label={formatMessage({ id: 'settings.chat.multi', defaultMessage: 'Multi-turn chat' })}
        />
      </div>
    </Panel>
  )
}
