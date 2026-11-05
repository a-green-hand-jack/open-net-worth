import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, X } from 'lucide-react'
import { desktopClientBridge } from '../../../platform/desktop'
import { useOpenVoiceSetup, useVoiceReadiness } from './VoiceCallButton'
import { dismissProblem, startCall, useVoiceCall } from './voiceCall'

// Why a call didn't start or stopped (`voice_calls` flag): the TOP ROW of the composer card, so it
// has the box's own width and corners (owner, 2026-11-03: inline in the toolbar was wrong, a strip
// wider than the box was weird). Plain words, the next step where there is one, a link to the
// app's logs for a worker problem, and always dismissable.

const LIVEKIT_CLOUD = 'https://cloud.livekit.io'

const problemMessages = defineMessages({
  micMac: { id: 'chat.voice.micMac', defaultMessage: "Open Net Worth isn't allowed to use the microphone. Turn it on in System Settings → Privacy & Security → Microphone, then try again." },
  micSystem: { id: 'chat.voice.micSystem', defaultMessage: "Open Net Worth isn't allowed to use the microphone. Turn it on in your system's privacy settings, then try again." },
  micBrowser: { id: 'chat.voice.micBrowser', defaultMessage: "The microphone is blocked. Allow it for this site (the browser's address bar, or your system's privacy settings), then try again." },
  micMissing: { id: 'chat.voice.micMissing', defaultMessage: 'No microphone was found. Connect one, then try again.' },
  insecure: { id: 'chat.voice.insecure', defaultMessage: 'Calls need a secure address: open the app on localhost or over HTTPS.' },
  left: { id: 'chat.voice.left', defaultMessage: 'Lucius left the call. Call again to keep going.' },
  dropped: { id: 'chat.voice.dropped', defaultMessage: 'The call dropped.' },
  noPickup: { id: 'chat.voice.noPickup', defaultMessage: "Lucius didn't pick up." },
  startFailed: { id: 'chat.voice.startFailed', defaultMessage: 'The call could not start.' },
})

export function VoiceCallNotice({
  sessionId,
  busy = false,
}: {
  sessionId: string
  /** Lucius is answering something: a call's problem has been moved on from. */
  busy?: boolean
}) {
  const intl = useAppIntl()
  const call = useVoiceCall()
  const readiness = useVoiceReadiness()
  const openSetup = useOpenVoiceSetup()
  const navigate = useNavigate()
  const [dismissedReason, setDismissedReason] = useState<string | null>(null)
  // LiveKit's raw reason, folded away: the plain message stays the thing you read.
  const [detailOpen, setDetailOpen] = useState(false)
  const problem = call.problem
  // Once you've moved on — sent Lucius a message — the call's problem is old news: it went on
  // showing above an unrelated chat (owner, 2026-11-03). No call is on when there is a problem,
  // so this turn is always yours.
  const hasProblem = problem !== null
  useEffect(() => {
    if (busy && hasProblem) dismissProblem()
  }, [busy, hasProblem])
  // Set up, but the worker can't take calls right now — say so before anyone presses Call.
  const workerReason =
    readiness?.ready && !readiness.worker.running
      ? readiness.worker.error || intl.formatMessage({ id: 'chat.voice.notReady', defaultMessage: 'Voice calls are set up but not ready to take a call yet.' })
      : null
  const showWorker = !problem && workerReason && workerReason !== dismissedReason
  if (!problem && !showWorker) return null

  const message = problem?.messageCode ? intl.formatMessage(problemMessages[problem.messageCode] as MessageDescriptor) : problem?.message ?? workerReason
  const dismiss = () => (problem ? dismissProblem() : setDismissedReason(workerReason))
  const micSettings = desktopClientBridge()?.openMicrophoneSettings
  const openLogs = () => void navigate({ to: '/settings', search: { sub: 'developer' } } as never)
  return (
    <div className="lx-call-notice" role="alert">
      <AlertCircle size={14} aria-hidden="true" />
      <span className="lx-call-notice-text">{message}</span>
      <button type="button" className="lx-call-notice-close" aria-label={intl.formatMessage({ id: 'chat.voice.dismiss', defaultMessage: 'Dismiss' })} onClick={dismiss}>
        <X size={14} />
      </button>
      {/* The ways out sit on a row of their own under the words: beside them, a long reason was
          squeezed into a narrow column on a phone (owner, 2026-11-03). */}
      <div className="lx-call-notice-actions">
        {problem?.kind === 'setup' && (
          <button type="button" className="lx-call-notice-action" onClick={openSetup}>
            {intl.formatMessage({ id: 'chat.voice.settings', defaultMessage: 'Voice calls settings' })}
          </button>
        )}
        {problem?.kind === 'mic' && micSettings && (
          // macOS never asks twice: a refused microphone is undone only in System Settings.
          <button
            type="button"
            className="lx-call-notice-action"
            onClick={() => void micSettings()}
          >
            {intl.formatMessage({ id: 'chat.voice.systemSettings', defaultMessage: 'Open System Settings' })}
          </button>
        )}
        {problem?.kind === 'service' && (
          // Out of credit is fixed in the owner's LiveKit project, not here: take them there.
          <a
            className="lx-call-notice-link"
            href={LIVEKIT_CLOUD}
            target="_blank"
            rel="noopener noreferrer"
          >
            {intl.formatMessage({ id: 'chat.voice.openLiveKit', defaultMessage: 'Open LiveKit' })}
          </a>
        )}
        {problem && problem.kind !== 'insecure' ? (
          <button
            type="button"
            className="lx-call-notice-action"
            onClick={() => void startCall(sessionId)}
          >
            {problem.kind === 'dropped' ? intl.formatMessage({ id: 'chat.voice.callAgain', defaultMessage: 'Call again' }) : intl.formatMessage({ id: 'chat.voice.tryAgain', defaultMessage: 'Try again' })}
          </button>
        ) : showWorker ? (
          <button type="button" className="lx-call-notice-action" onClick={openLogs}>
            {intl.formatMessage({ id: 'chat.voice.logs', defaultMessage: 'View logs' })}
          </button>
        ) : null}
        {problem?.detail && (
          <button
            type="button"
            className="lx-call-notice-action"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((v) => !v)}
          >
            {detailOpen ? intl.formatMessage({ id: 'chat.voice.hideDetails', defaultMessage: 'Hide details' }) : intl.formatMessage({ id: 'chat.voice.details', defaultMessage: 'Details' })}
          </button>
        )}
      </div>
      {detailOpen && problem?.detail && <p className="lx-call-notice-detail">{problem.detail}</p>}
    </div>
  )
}
