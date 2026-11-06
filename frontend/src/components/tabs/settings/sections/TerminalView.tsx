import { useAppIntl } from '../../../../i18n/useAppIntl'
// The terminal itself: xterm.js on a WebSocket to /api/terminal (api/terminal.py describes the
// wire format). Loaded only when someone opens a terminal.
import '@xterm/xterm/css/xterm.css'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'
import { Btn } from '../ds'

type EndReason = 'ended' | 'sign-in-again'

function socketUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${scheme}//${window.location.host}/api/terminal`
}

export function TerminalView({ onEnded }: { onEnded: (reason: EndReason) => void }) {
  const { formatMessage } = useAppIntl()
  const host = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState<number | 'ended' | 'auth' | null>(null)
  const [signInAgain, setSignInAgain] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      // eslint-disable-next-line no-restricted-syntax -- an xterm.js option, not CSS
      fontSize: 13,
      scrollback: 5000,
      theme: { background: '#0e0f12', foreground: '#e6e6e6' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()

    const ws = new WebSocket(socketUrl())
    ws.binaryType = 'arraybuffer'
    const send = (message: object) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
    }
    ws.onopen = () => {
      send({ type: 'resize', cols: term.cols, rows: term.rows })
      term.focus()
    }
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data) as { type?: string }
        if (message.type === 'exit') setNote('ended')
        return
      }
      term.write(new Uint8Array(event.data as ArrayBuffer))
    }
    ws.onclose = (event) => {
      if (event.reason === 'fresh_session_required') {
        setSignInAgain(true)
        setNote('auth')
        return
      }
      setNote((current) => current ?? event.code)
    }
    const data = term.onData((input) => send({ type: 'input', data: input }))
    const size = term.onResize(({ cols, rows }) => send({ type: 'resize', cols, rows }))
    const observer = new ResizeObserver(() => fit.fit())
    observer.observe(el)

    return () => {
      observer.disconnect()
      data.dispose()
      size.dispose()
      ws.onclose = null
      ws.close()
      term.dispose()
    }
  }, [])

  return (
    <div className="rd-term">
      <div className="rd-term-screen" ref={host} />
      {note && (
        <div className="rd-term-note" role="status">
          <span className="rd-help">
            {note === 'auth'
              ? formatMessage({
                  id: 'settings.remaining.terminalAuth',
                  defaultMessage: 'For your security the terminal asks for a recent sign-in.',
                })
              : note === 4401
                ? formatMessage({
                    id: 'settings.remaining.terminalClosed401',
                    defaultMessage: 'Not signed in.',
                  })
                : note === 4403
                  ? formatMessage({
                      id: 'settings.remaining.terminalClosed403',
                      defaultMessage: 'The connection was refused.',
                    })
                  : note === 4404
                    ? formatMessage({
                        id: 'settings.remaining.terminalClosed404',
                        defaultMessage: 'The terminal is not available.',
                      })
                    : note === 4408
                      ? formatMessage({
                          id: 'settings.remaining.terminalClosed408',
                          defaultMessage: 'Closed after 15 minutes without activity.',
                        })
                      : note === 4409
                        ? formatMessage({
                            id: 'settings.remaining.terminalClosed409',
                            defaultMessage: 'Another terminal is already open. Close it first.',
                          })
                        : note === 1009
                          ? formatMessage({
                              id: 'settings.remaining.terminalClosed1009',
                              defaultMessage: 'That message was too large.',
                            })
                          : formatMessage({
                              id: 'settings.remaining.terminalEnded',
                              defaultMessage: 'The session ended.',
                            })}
          </span>
          <Btn onClick={() => onEnded(signInAgain ? 'sign-in-again' : 'ended')}>
            {signInAgain
              ? formatMessage({ id: 'settings.remaining.continue', defaultMessage: 'Continue' })
              : formatMessage({ id: 'settings.remaining.close', defaultMessage: 'Close' })}
          </Btn>
        </div>
      )}
    </div>
  )
}
