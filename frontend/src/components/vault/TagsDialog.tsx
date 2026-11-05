import { vaultError } from './vaultErrors'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useState } from 'react'
import { setVaultTags, type VaultItem } from '../../api/vault'
import { refreshVault, useVault } from '../../hooks/useVault'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TagInput } from '../ui/TagInput'
import { tagCounts } from './vaultFormat'
import { Plus } from '../../ui/icons'

const MAX_TAGS = 10 // services/vault.py MAX_TAGS

/** The item's tags: type one and press Enter (or a comma), or pick one already in use. */
export function TagsDialog({ item, onClose }: { item: VaultItem; onClose: () => void }) {
  const vaultIntl = useAppIntl()
  const { data } = useVault()
  const [tags, setTags] = useState<string[]>(item.tags ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inUse = new Set(tags.map((t) => t.toLowerCase()))
  const suggestions = tagCounts(data?.items ?? [])
    .map((t) => t.tag)
    .filter((t) => !inUse.has(t.toLowerCase()))
  const save = async () => {
    const before = (item.tags ?? []).join('\n')
    if (tags.join('\n') === before) return onClose()
    setSaving(true)
    setError(null)
    try {
      await setVaultTags(item.id, tags)
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
      title={vaultIntl.formatMessage({ id: "vault.ui.1331275bc537", defaultMessage: "Tags" })}
      size="sm"
      footer={
        <div className="ui-confirm-actions">
          <Button size="sm" variant="ghost" onClick={onClose}>
            {vaultIntl.formatMessage({ id: "vault.ui.19766ed6ccb2", defaultMessage: "Cancel" })}
          </Button>
          <Button size="sm" variant="primary" loading={saving} onClick={() => void save()}>
            {vaultIntl.formatMessage({ id: "vault.ui.1509f561f241", defaultMessage: "Save" })}
          </Button>
        </div>
      }
    >
      <div className="vault-rename vault-tags-body" data-autofocus tabIndex={-1}>
        <TagInput
          value={tags}
          onChange={setTags}
          max={MAX_TAGS}
          placeholder={vaultIntl.formatMessage({ id: "vault.ui.78732778efd0", defaultMessage: "Add a tag, e.g. Apartment" })}
        />
        {suggestions.length > 0 && tags.length < MAX_TAGS && (
          <div className="vault-tags" role="group" aria-label={vaultIntl.formatMessage({ id: "vault.ui.db17dbd3e016", defaultMessage: "Tags in use" })}>
            {suggestions.map((t) => (
              <button
                key={t}
                type="button"
                className="vault-tag vault-tag--add"
                aria-label={vaultIntl.formatMessage({ id: 'vault.tagAdd', defaultMessage: 'Add tag {tag}' }, { tag: t })}
                onClick={() => setTags([...tags, t])}
              >
                <Plus size={12} aria-hidden="true" />
                {t}
              </button>
            ))}
          </div>
        )}
        <p className="vault-rename-help">
          {vaultIntl.formatMessage({ id: "vault.ui.03d144a1c479", defaultMessage: "A tag groups things across Documents — tap one to see everything that has it." })}
        </p>
        {error && <p className="vault-error">{error}</p>}
      </div>
    </Modal>
  )
}
