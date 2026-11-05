import { defineMessages, type IntlShape } from 'react-intl'
import { useEffect, useState } from 'react'
import type { CallState } from './voiceCall'
import type { OrbState } from './VoiceOrb'

// What a call says about itself, shared by the bar, the stage and the pill so the three never
// disagree. `line` is the stage's status: it never changes with who is speaking — that is shown,
// not announced, so a screen reader isn't read every breath.

export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return `${m}:${String(seconds % 60).padStart(2, '0')}`
}

export interface CallStatus {
  /** The bar's one line ("Connected · 2:14"). */
  text: string
  dot: 'wait' | 'warn' | 'live'
  /** The stage's line under the orb — empty unless something is happening (working, ringing,
   *  reconnecting): listening and muted need no words. */
  line: string
  /** The bare clock while live ("2:14"); the phase word otherwise. */
  short: string
  /** The call's clock, only while it is connected ("2:14"); empty otherwise. */
  time: string
}

const STATUS = defineMessages({
  calling: { id: 'chat.voice.calling', defaultMessage: 'Calling…' },
  ringing: { id: 'chat.voice.ringing', defaultMessage: 'Ringing…' },
  reconnecting: { id: 'chat.voice.reconnecting', defaultMessage: 'Reconnecting…' },
  ended: { id: 'chat.voice.ended', defaultMessage: 'Call ended' },
  working: { id: 'chat.voice.working', defaultMessage: 'Lucius is working…' },
  shortWorking: { id: 'chat.voice.shortWorking', defaultMessage: 'Working…' },
  connected: { id: 'chat.voice.connected', defaultMessage: 'Connected' },
})

export function callStatus(call: CallState, now: number, busy: boolean, intl?: IntlShape): CallStatus {
  const label = (key: keyof typeof STATUS) => intl ? intl.formatMessage(STATUS[key]) : STATUS[key].defaultMessage
  switch (call.phase) {
    case 'connecting': { const text = label('calling'); return { text, dot: 'wait', line: text, short: text, time: '' } }
    case 'ringing': { const text = label('ringing'); return { text, dot: 'wait', line: text, short: text, time: '' } }
    case 'reconnecting': { const text = label('reconnecting'); return { text, dot: 'warn', line: text, short: text, time: '' } }
    case 'ended': return { text: `${label('ended')} · ${clock(call.endedSeconds ?? 0)}`, dot: 'wait', line: '', short: label('ended'), time: '' }
    default: {
      const secs = call.connectedAt ? Math.max(0, Math.round((now - call.connectedAt) / 1000)) : 0
      const line = busy ? label('working') : ''
      return { text: busy ? line : `${label('connected')} · ${clock(secs)}`, dot: 'live', line, short: busy ? label('shortWorking') : clock(secs), time: clock(secs) }
    }
  }
}

export function orbState(call: CallState, busy: boolean): OrbState {
  switch (call.phase) {
    case 'connecting':
    case 'ringing':
      return 'calling'
    case 'reconnecting':
      return 'reconnecting'
    case 'ended':
      return 'ended'
    default:
      return busy ? 'working' : 'live'
  }
}

export type PillMode =
  | 'rest'
  | 'calling'
  | 'live'
  | 'attention'
  | 'reconnecting'
  | 'ended'
  | 'problem'

/** What the dock's collapsed pill shows: the call lives in the pill, no chat needed. */
export function pillMode(call: CallState, needsApproval: boolean): PillMode {
  if (call.problem) return 'problem'
  switch (call.phase) {
    case 'ended':
      return 'ended'
    case 'reconnecting':
      return 'reconnecting'
    case 'connecting':
    case 'ringing':
      return 'calling'
    case 'live':
      return needsApproval ? 'attention' : 'live'
    default:
      return 'rest'
  }
}

/** Now, ticking once a second while the call is live (for its clock). */
export function useCallClock(call: CallState): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (call.phase !== 'live') return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [call.phase])
  return now
}
