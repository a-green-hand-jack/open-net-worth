// The memory dialog, opened from the chat header's Memory button through components/chat/MemorySheet
// (which supplies the `.onw-settings` scope these classes need). It shows the same MemoryBrowser
// as Settings → Memory, under a search box that filters it.
import { useRef, useState } from 'react'
import {
  MEMORY_SETTINGS_KEY,
  getMemorySettings,
  useMemoryFacts,
} from '../../../hooks/useMemoryFacts'
import { useCachedFetchState } from '../../../state/queryCache'
import { Btn, Modal } from './ds'
import type { Toast } from './ds'
import { ForgetConfirm } from './MemoryParts'
import { MemoryBrowser } from './MemoryBrowser'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function MemoryDialog({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  const { formatMessage } = useAppIntl()
  const { facts, forgetAll } = useMemoryFacts(toast)
  const settings = useCachedFetchState(MEMORY_SETTINGS_KEY, getMemorySettings, { staleTime: 0 })
  const off = settings.data?.enabled === false
  const [q, setQ] = useState('')
  const [forgetEverything, setForgetEverything] = useState(false)
  const [inTopic, setInTopic] = useState(false)
  const browserEscape = useRef<(() => boolean) | null>(null)

  // The dialog owns Escape (and the X and scrim): an open confirm or edit is cancelled first.
  function close() {
    if (forgetEverything) setForgetEverything(false)
    else if (!browserEscape.current?.()) onClose()
  }

  return (
    <>
      <Modal
        title={formatMessage({ id: 'memoryDialog.title', defaultMessage: 'Stored memories' })}
        size="lg"
        // A fixed height: sized to its content, the dialog shrank with every keystroke of a
        // search and all but vanished on a phone when nothing matched.
        className="rd-mem-modal"
        onClose={close}
        footer={
          <div className="rd-mem-actions">
            {!inTopic && (
              <Btn
                variant="danger"
                style={{ marginRight: 'auto' }}
                disabled={!facts.length}
                onClick={() => setForgetEverything(true)}
              >
                {formatMessage({
                  id: 'memoryDialog.forgetAll',
                  defaultMessage: 'Forget everything',
                })}
              </Btn>
            )}
            <Btn onClick={onClose}>
              {formatMessage({ id: 'memoryDialog.done', defaultMessage: 'Done' })}
            </Btn>
          </div>
        }
      >
        <MemoryBrowser
          toast={toast}
          disabled={off}
          filter={q}
          escapeRef={browserEscape}
          onTopicOpen={setInTopic}
          header={
            <div className="rd-mem-head">
              <span className="rd-help">
                {off
                  ? formatMessage({
                      id: 'memoryDialog.off',
                      defaultMessage:
                        'Memory is off — Lucius is not learning new facts or using these. Turn it on in Settings → Memory.',
                    })
                  : formatMessage({
                      id: 'memoryDialog.description',
                      defaultMessage:
                        'Durable facts Lucius carries between conversations. Editing or forgetting one takes effect on the next turn.',
                    })}
              </span>
              <input
                className="rd-input"
                value={q}
                placeholder={formatMessage({
                  id: 'memoryDialog.searchPlaceholder',
                  defaultMessage: 'Search memories…',
                })}
                aria-label={formatMessage({
                  id: 'memoryDialog.search',
                  defaultMessage: 'Search memories',
                })}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          }
        />
      </Modal>
      {forgetEverything && (
        <ForgetConfirm
          pending={{ kind: 'all', count: facts.length }}
          onCancel={() => setForgetEverything(false)}
          onConfirm={() => {
            setForgetEverything(false)
            void forgetAll()
          }}
        />
      )}
    </>
  )
}
