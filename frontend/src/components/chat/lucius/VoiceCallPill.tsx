import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useEffect, useRef } from 'react'
import { AlertCircle, ChevronUp, Mic, MicOff, PhoneOff, X } from 'lucide-react'
import { Spark } from '../../../lucius/identity'
import { desktopClientBridge } from '../../../platform/desktop'
import {
  dismissProblem,
  expandCall,
  hangUp,
  minimizeCall,
  openVoiceSetup,
  startCall,
  toggleMute,
  useVoiceCall,

} from './voiceCall'
import { callStatus, orbState, pillMode, useCallClock } from './voiceCallStatus'
import { VoiceCallButton } from './VoiceCallButton'
import { VoiceOrb } from './VoiceOrb'

// The dock's collapsed pill with voice calls on (`voice_calls` flag): Call beside Ask Lucius, and
// the whole call happens IN the pill — it grows to hold the orb, the clock, Mute and End, and
// shrinks back on hang-up. Opening the chat is there (the chevron), never needed. With the flag
// off the dock renders its old single pill button, untouched.

const HOVER_DWELL_MS = 200

const problemLabels = defineMessages({
  mic: { id: 'chat.voice.problemMic', defaultMessage: "Can't use the microphone" },
  dropped: { id: 'chat.voice.problemDropped', defaultMessage: 'Call dropped' },
  setup: { id: 'chat.voice.problemStart', defaultMessage: "Call couldn't start" },
  service: { id: 'chat.voice.problemService', defaultMessage: 'LiveKit refused the call' },
  insecure: { id: 'chat.voice.problemStart', defaultMessage: "Call couldn't start" },
  other: { id: 'chat.voice.problemStart', defaultMessage: "Call couldn't start" },
})
const problemActions = defineMessages({
  mic: { id: 'chat.voice.tryAgain', defaultMessage: 'Try again' },
  dropped: { id: 'chat.voice.callAgain', defaultMessage: 'Call again' },
  setup: { id: 'chat.voice.setup', defaultMessage: 'Set up' },
  service: { id: 'chat.voice.tryAgain', defaultMessage: 'Try again' },
  insecure: { id: 'chat.voice.tryAgain', defaultMessage: 'Try again' },
  other: { id: 'chat.voice.tryAgain', defaultMessage: 'Try again' },
})

export function VoiceCallPill({
  sessionId,
  busy,
  needsApproval,
  onAsk,
  onHoverOpen,
  onOpenDock,
}: {
  sessionId: string
  /** Lucius is working on the call's request (the call's own turn included). */
  busy: boolean
  /** The conversation is waiting on an approval card the pill can't show. */
  needsApproval: boolean
  /** Ask Lucius: open the dock on its composer. */
  onAsk: () => void
  /** Hovering Ask Lucius opens the dock, as the plain pill does. */
  onHoverOpen: () => void
  onOpenDock: () => void
}) {
  const intl = useAppIntl()
  const call = useVoiceCall()
  const now = useCallClock(call)
  const mode = pillMode(call, needsApproval)
  const status = callStatus(call, now, busy, intl)
  const root = useRef<HTMLDivElement>(null)
  const dwell = useRef<number | undefined>(undefined)
  const lastMode = useRef(mode)

  // The button you pressed unmounts as the pill changes shape: keep keyboard focus in the pill.
  useEffect(() => {
    const was = lastMode.current
    lastMode.current = mode
    const el = root.current
    if (!el || was === mode) return
    const focused = document.activeElement
    if (focused && focused !== document.body && !el.contains(focused)) return
    const target =
      mode === 'rest'
        ? el.querySelector<HTMLElement>('.lx-call-btn')
        : el.querySelector<HTMLElement>('.lx-dock-pill-open')
    target?.focus()
  }, [mode])
  useEffect(() => () => window.clearTimeout(dwell.current), [])

  const label =
    mode === 'rest'
      ? 'Lucius'
      : mode === 'problem'
        ? intl.formatMessage({ id: 'chat.voice.problem', defaultMessage: 'Voice call problem' })
        : intl.formatMessage({ id: 'chat.voice.withLucius', defaultMessage: 'Voice call with Lucius' })
  return (
    <div
      ref={root}
      className="lx-dock-pill lx-dock-pill--call"
      role="group"
      aria-label={label}
      data-mode={mode}
      data-working={(mode === 'live' && busy) || undefined}
      data-muted={call.muted || undefined}
    >
      {mode === 'rest' && (
        <>
          <VoiceCallButton sessionId={sessionId} tone="pill" />
          <button
            type="button"
            className="lx-dock-pill-ask"
            onMouseEnter={() => {
              window.clearTimeout(dwell.current)
              dwell.current = window.setTimeout(onHoverOpen, HOVER_DWELL_MS)
            }}
            onMouseLeave={() => window.clearTimeout(dwell.current)}
            onClick={() => {
              window.clearTimeout(dwell.current)
              onAsk()
            }}
          >
            <Spark size={13} />
            {intl.formatMessage({ id: 'chat.dock.ask', defaultMessage: 'Ask Lucius' })}
          </button>
        </>
      )}

      {mode === 'problem' && call.problem && (
        <>
          <span className="lx-dock-pill-alert" aria-hidden="true">
            <AlertCircle size={13} />
          </span>
          <button type="button" className="lx-dock-pill-open" onClick={onOpenDock}>
            <span className="lx-dock-pill-time" role="alert">
              {intl.formatMessage(problemLabels[call.problem.kind] as MessageDescriptor)}
            </span>
          </button>
          {(() => {
            // On a Mac desktop app a refused microphone is undone in System Settings, never by
            // calling again: macOS doesn't ask twice.
            const micSettings =
              call.problem.kind === 'mic'
                ? desktopClientBridge()?.openMicrophoneSettings
                : undefined
            return (
              <button
                type="button"
                className="lx-dock-pill-review"
                onClick={() =>
                  micSettings
                    ? void micSettings()
                    : call.problem?.kind === 'setup'
                      ? openVoiceSetup()
                      : void startCall(sessionId)
                }
              >
                {micSettings ? intl.formatMessage({ id: 'chat.voice.openSettings', defaultMessage: 'Open Settings' }) : intl.formatMessage(problemActions[call.problem.kind] as MessageDescriptor)}
              </button>
            )
          })()}
          <button
            type="button"
            className="lx-dock-pill-btn"
            aria-label={intl.formatMessage({ id: 'chat.voice.dismiss', defaultMessage: 'Dismiss' })}
            onClick={dismissProblem}
          >
            <X size={14} />
          </button>
        </>
      )}

      {mode === 'ended' && (
        <span className="lx-dock-pill-time" role="status">
          {status.text}
        </span>
      )}

      {(mode === 'calling' ||
        mode === 'live' ||
        mode === 'reconnecting' ||
        mode === 'attention') && (
        <>
          <button
            type="button"
            className="lx-dock-pill-open"
            aria-label={intl.formatMessage({ id: 'chat.voice.open', defaultMessage: 'Open call' })}
            onClick={() => {
              expandCall()
              onOpenDock()
            }}
          >
            <VoiceOrb state={orbState(call, busy)} muted={call.muted} size="mini" />
            <span
              className="lx-dock-pill-time"
              role="status"
              aria-live={mode === 'attention' ? 'assertive' : 'polite'}
            >
              {mode === 'attention' ? intl.formatMessage({ id: 'chat.voice.needsApproval', defaultMessage: 'Needs approval' }) : status.short}
            </span>
            {mode === 'live' && <ChevronUp size={14} aria-hidden="true" />}
          </button>
          {mode === 'attention' && (
            <button
              type="button"
              className="lx-dock-pill-review"
              onClick={() => {
                minimizeCall()
                onOpenDock()
              }}
            >
              {intl.formatMessage({ id: 'chat.voice.review', defaultMessage: 'Review' })}
            </button>
          )}
          <button
            type="button"
            className="lx-dock-pill-btn"
            aria-pressed={call.muted}
            aria-label={call.muted ? intl.formatMessage({ id: 'chat.voice.unmute', defaultMessage: 'Unmute' }) : intl.formatMessage({ id: 'chat.voice.mute', defaultMessage: 'Mute' })}
            disabled={call.phase !== 'live'}
            onClick={() => void toggleMute()}
          >
            {call.muted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            type="button"
            className="lx-dock-pill-btn lx-dock-pill-btn--end"
            aria-label={intl.formatMessage({ id: 'chat.voice.endCall', defaultMessage: 'End call' })}
            onClick={() => void hangUp()}
          >
            <PhoneOff size={14} />
          </button>
        </>
      )}
    </div>
  )
}
