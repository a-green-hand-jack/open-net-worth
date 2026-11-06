import { vaultError } from './vaultErrors'
import { useAppIntl } from '../../i18n/useAppIntl'
// The parts of an item's page below its preview: ONE action bar, then grouped cards — Note
// (once written), Details, Settings (your own files) and Manage. Replaced a lone "Ask Lucius"
// button and a row of equal-weight buttons that wrapped onto a second line (owner: "the layout
// is not good").
import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { updateVaultFile, type VaultFileDetails, type VaultItem } from '../../api/vault'
import { refreshVault } from '../../hooks/useVault'
import { useLuciusMention } from '../../state/chatComposer'
import type { ArtifactRef } from '../../types/chat'
import { downloadArtifact } from '../../utils/useArtifactContent'
import {
  ArrowLeftRight,
  Box,
  Check,
  Download,
  FolderMinus,
  Landmark,
  Pencil,
  Sparkles,
  StickyNote,
  Tags,
  Trash2,
} from '../../ui/icons'
import { Switch } from '../ui/Switch'
import { TextField } from '../ui/TextField'
import { ItemActionDialog, type ItemAction } from './ItemActionDialog'
import { removalActions } from './vaultFormat'

const ICON = { size: 16, strokeWidth: 1.8 } as const

/** Where the item is managed: a receipt's transaction, a statement's account, an asset. */
function LinkedTile({ item }: { item: VaultItem }) {
  const vaultIntl = useAppIntl()
  const navigate = useNavigate()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const go = (to: string, search: Record<string, string>) => void navigate({ to, search } as any)
  let tile: [string, string, ReactNode, () => void] | null = null
  if (item.kind === 'receipt' && item.transaction_id) {
    const txn = item.transaction_id
    tile = [
      vaultIntl.formatMessage({ id: "vault.ui.5e377bdb4e78", defaultMessage: "View transaction" }),
      vaultIntl.formatMessage({ id: "vault.ui.eec26ddd9a40", defaultMessage: "Transaction" }),
      <ArrowLeftRight {...ICON} />,
      () => go('/accounts', { txn }),
    ]
  } else if (item.kind === 'statement' && item.account_id) {
    const account = item.account_id
    tile = [vaultIntl.formatMessage({ id: "vault.ui.81046a4ce8a6", defaultMessage: "Open account" }), vaultIntl.formatMessage({ id: "vault.ui.7e1b0d5641f2", defaultMessage: "Account" }), <Landmark {...ICON} />, () => go('/accounts', { account })]
  } else if (item.kind === 'asset' && item.asset_id) {
    const id = item.asset_id
    tile = [vaultIntl.formatMessage({ id: "vault.ui.97c0d733eb49", defaultMessage: "Open asset" }), vaultIntl.formatMessage({ id: "vault.ui.80d298c9f240", defaultMessage: "Asset" }), <Box {...ICON} />, () => go('/assets', { id })]
  }
  if (!tile) return null
  const [name, label, icon, onClick] = tile
  return (
    <button type="button" className="vault-action-tile" aria-label={name} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function ActionBar({
  item,
  artifact,
  onAsked,
}: {
  item: VaultItem
  artifact: ArtifactRef
  onAsked?: () => void
}) {
  const vaultIntl = useAppIntl()
  const mention = useLuciusMention()
  const [asked, setAsked] = useState(false)
  return (
    <div className="vault-action-bar">
      {!item.private && (
        <button
          type="button"
          className="vault-action-tile vault-action-tile--lucius"
          aria-label={asked ? vaultIntl.formatMessage({ id: "vault.ui.4362778a2943", defaultMessage: "Added to your message" }) : vaultIntl.formatMessage({ id: "vault.ui.5bdb6b972275", defaultMessage: "Ask Lucius about this" })}
          onClick={() => {
            mention({ type: 'document', ref: item.id, label: item.title }, { open: false })
            setAsked(true)
            onAsked?.()
          }}
        >
          {asked ? <Check {...ICON} /> : <Sparkles {...ICON} />}
          <span>{asked ? vaultIntl.formatMessage({ id: "vault.ui.6b02e0d363a4", defaultMessage: "Added" }) : vaultIntl.formatMessage({ id: "vault.ui.a31f1e1b119f", defaultMessage: "Ask Lucius" })}</span>
        </button>
      )}
      <LinkedTile item={item} />
      {item.kind === 'artifact' ? (
        <button
          type="button"
          className="vault-action-tile"
          onClick={() => void downloadArtifact(artifact)}
        >
          <Download {...ICON} />
          <span>{vaultIntl.formatMessage({ id: "vault.ui.d6eafe823591", defaultMessage: "Download" })}</span>
        </button>
      ) : item.file_url ? (
        <a className="vault-action-tile" href={item.file_url} download={item.filename || true}>
          <Download {...ICON} />
          <span>{vaultIntl.formatMessage({ id: "vault.ui.d6eafe823591", defaultMessage: "Download" })}</span>
        </a>
      ) : null}
    </div>
  )
}

/** Year and Private for your own files; Private alone for an asset's file — its asset page's
 *  "Lucius can read" switch, flipped (owner: "i can't see we can control that in the document
 *  modal"). */
export function SettingsCard({ item }: { item: VaultItem }) {
  const vaultIntl = useAppIntl()
  const [year, setYear] = useState(item.year ? String(item.year) : '')
  const [error, setError] = useState<string | null>(null)
  // The switch moves on the tap; the stored value takes over once it changes.
  const [privatePending, setPrivatePending] = useState<{ value: boolean; basis: boolean } | null>(
    null,
  )
  const privateShown =
    privatePending && privatePending.basis === item.private ? privatePending.value : item.private
  const save = async (changes: VaultFileDetails) => {
    setError(null)
    try {
      await updateVaultFile(item.id, changes)
      refreshVault()
    } catch (e) {
      setPrivatePending(null)
      setError(vaultError(e, vaultIntl))
    }
  }
  const commitYear = () => {
    const next = year.trim() ? Number(year.trim()) : null
    if (next !== (item.year ?? null)) void save({ year: next })
  }
  return (
    <section className="vault-section">
      <h3 className="vault-section-title">{vaultIntl.formatMessage({ id: "vault.ui.74a883a037bc", defaultMessage: "Settings" })}</h3>
      <div className="vault-card">
        {item.kind === 'file' && (
          <label className="vault-card-row">
            <span>{vaultIntl.formatMessage({ id: "vault.ui.89f6832560de", defaultMessage: "Year" })}</span>
            <TextField
              className="vault-card-control vault-card-control--year"
              inputMode="numeric"
              placeholder={vaultIntl.formatMessage({ id: "vault.ui.3e6455ed4057", defaultMessage: "e.g. 2025" })}
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              onBlur={commitYear}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </label>
        )}
        <div className="vault-card-row">
          <span className="vault-card-text">
            <span>{vaultIntl.formatMessage({ id: "vault.ui.c63eb6720c6e", defaultMessage: "Private" })}</span>
            <span className="vault-card-help">
              {vaultIntl.formatMessage({ id: "vault.ui.1a0070505444", defaultMessage: "Lucius can't read a Private file — not even when you ask." })}
              {item.kind === 'asset' && vaultIntl.formatMessage({ id: "vault.ui.4a79b3330543", defaultMessage: " The same as “Lucius can read” on its asset’s page." })}
            </span>
          </span>
          <Switch
            aria-label={vaultIntl.formatMessage({ id: "vault.ui.c63eb6720c6e", defaultMessage: "Private" })}
            checked={privateShown}
            onChange={(e) => {
              setPrivatePending({ value: e.target.checked, basis: item.private })
              void save({ private: e.target.checked })
            }}
          />
        </div>
      </div>
      {error && <p className="vault-error">{error}</p>}
    </section>
  )
}

/** The user's own words about the item — shown once written, selectable so a number in it
 *  can be copied; written from Manage. */
export function NoteCard({ note }: { note: string }) {
  const vaultIntl = useAppIntl()
  return (
    <section className="vault-section">
      <h3 className="vault-section-title">{vaultIntl.formatMessage({ id: "vault.ui.d8da2c49df39", defaultMessage: "Note" })}</h3>
      <p className="vault-note">{note}</p>
    </section>
  )
}

/** The item's tags — each shows everything that has it. */
export function TagsRow({ tags, onTag }: { tags: string[]; onTag?: (tag: string) => void }) {
  const vaultIntl = useAppIntl()
  return (
    <div className="vault-tags" role="group" aria-label={vaultIntl.formatMessage({ id: "vault.ui.1331275bc537", defaultMessage: "Tags" })}>
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          className="vault-tag"
          aria-label={vaultIntl.formatMessage({ id: 'vault.tagShow', defaultMessage: 'Show everything tagged {tag}' }, { tag: t })}
          onClick={() => onTag?.(t)}
        >
          <span className="vault-tag-hash" aria-hidden="true">
            #
          </span>
          {t}
        </button>
      ))}
    </div>
  )
}

/** Rename, the note and the tags, then the removals this kind allows — each confirmed first. */
export function ManageCard({ item, onRemoved }: { item: VaultItem; onRemoved: () => void }) {
  const vaultIntl = useAppIntl()
  const [action, setAction] = useState<ItemAction | null>(null)
  return (
    <section className="vault-section">
      <h3 className="vault-section-title">{vaultIntl.formatMessage({ id: "vault.ui.5a23444828db", defaultMessage: "Manage" })}</h3>
      <div className="vault-card">
        <button
          type="button"
          className="vault-card-row vault-card-btn"
          onClick={() => setAction('rename')}
        >
          <Pencil size={16} strokeWidth={1.7} aria-hidden="true" />
          <span>{vaultIntl.formatMessage({ id: "vault.ui.3064d79a295c", defaultMessage: "Rename" })}</span>
        </button>
        <button
          type="button"
          className="vault-card-row vault-card-btn"
          onClick={() => setAction('note')}
        >
          <StickyNote size={16} strokeWidth={1.7} aria-hidden="true" />
          <span>{item.note ? vaultIntl.formatMessage({ id: "vault.ui.299e604ccff3", defaultMessage: "Edit note" }) : vaultIntl.formatMessage({ id: "vault.ui.322c0e13ef4f", defaultMessage: "Add a note" })}</span>
        </button>
        <button
          type="button"
          className="vault-card-row vault-card-btn"
          onClick={() => setAction('tags')}
        >
          <Tags size={16} strokeWidth={1.7} aria-hidden="true" />
          <span>{item.tags?.length ? vaultIntl.formatMessage({ id: "vault.ui.4687da851c22", defaultMessage: "Edit tags" }) : vaultIntl.formatMessage({ id: "vault.ui.9c29db454e3d", defaultMessage: "Add tags" })}</span>
        </button>
        {removalActions(item, vaultIntl).map((removal) => (
          <button
            key={removal.label}
            type="button"
            className={`vault-card-row vault-card-btn${removal.keeps ? '' : ' vault-card-btn--danger'}`}
            onClick={() => setAction(removal)}
          >
            {removal.keeps ? (
              <FolderMinus size={16} strokeWidth={1.7} aria-hidden="true" />
            ) : (
              <Trash2 size={16} strokeWidth={1.7} aria-hidden="true" />
            )}
            <span>{removal.label}</span>
          </button>
        ))}
      </div>
      {action && (
        <ItemActionDialog
          item={item}
          action={action}
          onClose={() => setAction(null)}
          onRemoved={onRemoved}
        />
      )}
    </section>
  )
}
