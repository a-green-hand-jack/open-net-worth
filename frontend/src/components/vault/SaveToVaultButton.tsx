import { vaultError } from './vaultErrors'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useState } from 'react'
import { removeArtifactFromVault, saveArtifactToVault } from '../../api/vault'
import { refreshVault, useVault } from '../../hooks/useVault'
import { Bookmark, BookmarkCheck } from '../../ui/icons'

// "Save to Documents" on an artifact Lucius made — the user decides what outlives the chat. Saved
// state comes from the shared Vault listing (one request for every card on screen); a click
// flips it immediately and the listing catches up.
export function SaveToVaultButton({ artifactId }: { artifactId: string }) {
  const vaultIntl = useAppIntl()
  const { data } = useVault({ staleTime: 30_000 })
  const listed = !!data?.items.some((i) => i.kind === 'artifact' && i.source_id === artifactId)
  // The click's result shows at once, but only until the listing moves: from then on the
  // listing is the truth again, so a change made elsewhere (the Documents panel, Lucius) shows here.
  const [optimistic, setOptimistic] = useState<{ value: boolean; basis: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saved = optimistic && optimistic.basis === listed ? optimistic.value : listed

  const toggle = async () => {
    if (busy) return
    const next = !saved
    setBusy(true)
    setError(null)
    setOptimistic({ value: next, basis: listed })
    try {
      if (next) await saveArtifactToVault(artifactId)
      else await removeArtifactFromVault(artifactId)
      refreshVault()
    } catch (e) {
      setOptimistic(null)
      setError(vaultError(e, vaultIntl))
    } finally {
      setBusy(false)
    }
  }

  const label = error ? vaultIntl.formatMessage({ id: "vault.ui.d8b8392e2c54", defaultMessage: "Try again" }) : saved ? vaultIntl.formatMessage({ id: 'vault.saved', defaultMessage: 'Saved' }) : vaultIntl.formatMessage({ id: 'vault.save', defaultMessage: 'Save' })
  const title = error ?? (saved ? vaultIntl.formatMessage({ id: "vault.ui.23e23a277dbe", defaultMessage: "In Documents — click to remove it" }) : vaultIntl.formatMessage({ id: "vault.ui.1ec12e8be899", defaultMessage: "Save to Documents" }))
  return (
    <button
      type="button"
      className={`artifact-chip-open artifact-chip-save${saved ? ' is-saved' : ''}`}
      onClick={() => void toggle()}
      aria-pressed={saved}
      aria-label={saved ? vaultIntl.formatMessage({ id: "vault.ui.5a5a7f8551c7", defaultMessage: "Saved to Documents" }) : vaultIntl.formatMessage({ id: "vault.ui.1ec12e8be899", defaultMessage: "Save to Documents" })}
      title={title}
      disabled={busy}
    >
      {saved ? (
        <BookmarkCheck size={13} strokeWidth={1.8} />
      ) : (
        <Bookmark size={13} strokeWidth={1.6} />
      )}
      <span className="artifact-chip-label">{label}</span>
    </button>
  )
}
