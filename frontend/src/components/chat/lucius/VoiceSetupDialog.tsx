import { useAppIntl } from '../../../i18n/useAppIntl'
import { Button, Modal } from '../../ui'
import { useConnectorSaveHost } from '../../tabs/connectors/formSave'
import { VoiceSection } from '../../tabs/connectors/VoiceSection'
import { invalidateQueryCache } from '../../../state/queryCache'
import { VOICE_CONFIG_KEY } from './VoiceCallButton'

/** Voice calls setup right where the owner is (`voice_calls` flag): the SAME form and Save as
 *  Connectors → Voice calls, over the current screen instead of navigating away (owner,
 *  2026-11-03). Saving refreshes the call button and notice. */
export function VoiceSetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const intl = useAppIntl()
  const host = useConnectorSaveHost()
  const dirty = !!host.state?.dirty
  const close = () => {
    invalidateQueryCache(VOICE_CONFIG_KEY)
    onClose()
  }
  const save = async () => {
    if (await host.run()) close()
  }
  return (
    <Modal
      open={open}
      onClose={close}
      title={intl.formatMessage({ id: 'chat.voice.settingsTitle', defaultMessage: 'Voice calls' })}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {dirty ? intl.formatMessage({ id: 'chat.restore.cancel', defaultMessage: 'Cancel' }) : intl.formatMessage({ id: 'chat.voice.done', defaultMessage: 'Done' })}
          </Button>
          {dirty && (
            <Button variant="primary" onClick={() => void save()} loading={!!host.state?.saving}>
              {intl.formatMessage({ id: 'chat.voice.save', defaultMessage: 'Save' })}
            </Button>
          )}
        </>
      }
    >
      <host.Provider>
        <VoiceSection />
      </host.Provider>
    </Modal>
  )
}
