import { vaultError } from './vaultErrors'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useRef, useState } from 'react'
import { setVaultNote, type VaultItem } from '../../api/vault'
import { useCaretAtEnd } from '../../hooks/useCaretAtEnd'
import { refreshVault } from '../../hooks/useVault'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TextArea } from '../ui/TextArea'

const MAX_NOTE = 1000 // services/vault.py MAX_NOTE

/** One note per item, in the user's own words. Saving it empty removes it. */
export function NoteDialog({ item, onClose }: { item: VaultItem; onClose: () => void }) {
  const vaultIntl = useAppIntl()
  const [text, setText] = useState(item.note ?? '')
  const [saving, setSaving] = useState<'save' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const caretAtEnd = useCaretAtEnd()
  // A held Cmd/Ctrl+Enter repeats faster than `saving` re-renders.
  const busy = useRef(false)
  const write = async (next: string | null, action: 'save' | 'remove') => {
    if (busy.current) return
    if (next === (item.note ?? null)) return onClose()
    busy.current = true
    setSaving(action)
    setError(null)
    try {
      await setVaultNote(item.id, next)
      refreshVault()
      onClose()
    } catch (e) {
      setError(vaultError(e, vaultIntl))
      setSaving(null)
      busy.current = false
    }
  }
  const save = () => void write(text.trim() || null, 'save')
  return (
    <Modal
      open
      onClose={onClose}
      title={item.note ? vaultIntl.formatMessage({ id: "vault.ui.299e604ccff3", defaultMessage: "Edit note" }) : vaultIntl.formatMessage({ id: "vault.ui.322c0e13ef4f", defaultMessage: "Add a note" })}
      size="sm"
      footer={
        <div className="ui-confirm-actions">
          {item.note && (
            <Button
              size="sm"
              variant="ghost"
              className="vault-note-remove"
              loading={saving === 'remove'}
              disabled={saving === 'save'}
              onClick={() => void write(null, 'remove')}
            >
              {vaultIntl.formatMessage({ id: "vault.ui.c3812fc4acb8", defaultMessage: "Remove" })}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            {vaultIntl.formatMessage({ id: "vault.ui.19766ed6ccb2", defaultMessage: "Cancel" })}
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={saving === 'save'}
            disabled={saving === 'remove'}
            onClick={save}
          >
            {vaultIntl.formatMessage({ id: "vault.ui.1509f561f241", defaultMessage: "Save" })}
          </Button>
        </div>
      }
    >
      <div className="vault-rename">
        <TextArea
          aria-label={vaultIntl.formatMessage({ id: "vault.ui.d8da2c49df39", defaultMessage: "Note" })}
          rows={5}
          value={text}
          maxLength={MAX_NOTE}
          placeholder={vaultIntl.formatMessage({ id: "vault.ui.9d242aa37297", defaultMessage: "e.g. Signed copy. The original is in the safe." })}
          data-autofocus
          onFocus={caretAtEnd}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
          }}
        />
        <p className="vault-rename-help">
          {item.private
            ? vaultIntl.formatMessage({ id: "vault.ui.e148ee4b78ce", defaultMessage: "Lucius can read this note. Private hides only what’s in the file." })
            : vaultIntl.formatMessage({ id: "vault.ui.ddbaa3e2609a", defaultMessage: "Lucius reads your note when you ask about this file." })}
        </p>
        {error && <p className="vault-error">{error}</p>}
      </div>
    </Modal>
  )
}
