import { vaultError } from './vaultErrors'
import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useState } from 'react'
import { renameVaultItem, type VaultItem } from '../../api/vault'
import { refreshVault } from '../../hooks/useVault'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TextField } from '../ui/TextField'

const HELP = defineMessages({
  file: { id: 'vault.renameHelp.file', defaultMessage: 'Leave it empty to use the file name.' },
  statement: { id: 'vault.renameHelp.statement', defaultMessage: 'Leave it empty to go back to the account and month.' },
  receipt: { id: 'vault.renameHelp.receipt', defaultMessage: 'Leave it empty to go back to its transaction’s name.' },
  asset: { id: 'vault.renameHelp.asset', defaultMessage: 'The asset’s page shows this name too.' },
})
// These fall back to a name of their own when cleared; an artifact or asset file needs one.
const CLEARABLE = new Set<VaultItem['kind']>(['file', 'statement', 'receipt'])

export function RenameDialog({ item, onClose }: { item: VaultItem; onClose: () => void }) {
  const vaultIntl = useAppIntl()
  const [name, setName] = useState(item.title)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const next = name.trim()
  const blocked = !next && !CLEARABLE.has(item.kind)
  const save = async () => {
    if (blocked) return
    if (next === item.title) return onClose()
    setSaving(true)
    setError(null)
    try {
      await renameVaultItem(item.id, next || null)
      refreshVault()
      onClose()
    } catch (e) {
      setError(vaultError(e, vaultIntl))
      setSaving(false)
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={vaultIntl.formatMessage({ id: "vault.ui.3064d79a295c", defaultMessage: "Rename" })}
      size="sm"
      footer={
        <div className="ui-confirm-actions">
          <Button size="sm" variant="ghost" onClick={onClose}>
            {vaultIntl.formatMessage({ id: "vault.ui.19766ed6ccb2", defaultMessage: "Cancel" })}
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={saving}
            disabled={blocked}
            onClick={() => void save()}
          >
            {vaultIntl.formatMessage({ id: "vault.ui.1509f561f241", defaultMessage: "Save" })}
          </Button>
        </div>
      }
    >
      <form
        className="vault-rename"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <TextField
          aria-label={vaultIntl.formatMessage({ id: "vault.ui.dcd1d5223f73", defaultMessage: "Name" })}
          value={name}
          maxLength={160}
          // Not a person's name. iOS ignores autocomplete="off" for its "AutoFill Contact" bar
          // (it offered the owner's own name here) but never offers it on a search-type field.
          type="search"
          autoComplete="off"
          enterKeyHint="done"
          data-autofocus
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setName(e.target.value)}
        />
        {Object.hasOwn(HELP, item.kind) && <p className="vault-rename-help">{vaultIntl.formatMessage(HELP[item.kind as keyof typeof HELP] as MessageDescriptor)}</p>}
        {error && <p className="vault-error">{error}</p>}
      </form>
    </Modal>
  )
}
