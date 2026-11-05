import { useAppIntl } from '../../i18n/useAppIntl'
import type { VaultItem } from '../../api/vault'
import { VaultKindIcon } from './VaultList'

/** The preview's place for a file that has none (or can't be drawn): the same size as a
 *  preview, so every item's page has the same shape, saying to download it. */
export function NoPreview({ item, reason }: { item: VaultItem; reason?: string }) {
  const vaultIntl = useAppIntl()
  return (
    <div className="vault-preview-none">
      <VaultKindIcon item={item} size={28} />
      <p className="vault-preview-none-title">{vaultIntl.formatMessage({ id: "vault.ui.367167bf7381", defaultMessage: "No preview for this file" })}</p>
      <p className="vault-preview-none-hint">{reason ? `${reason}.` : vaultIntl.formatMessage({ id: "vault.ui.396c21e8549c", defaultMessage: "Download it to open it." })}</p>
    </div>
  )
}
