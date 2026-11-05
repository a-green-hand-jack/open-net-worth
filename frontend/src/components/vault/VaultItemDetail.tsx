import type { IntlShape } from 'react-intl'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useEffect, useRef } from 'react'
import type { VaultItem } from '../../api/vault'
import { isStandaloneApp, useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack'
import type { ArtifactRef } from '../../types/chat'
import { ArrowLeft, Lock, X } from '../../ui/icons'
import { DocumentPreview } from './DocumentPreview'
import { markFades } from './fades'
import { ActionBar, ManageCard, NoteCard, SettingsCard, TagsRow } from './VaultDetailSections'
import { formatDay, formatSize, kindLabel } from './vaultFormat'

function artifactRef(item: VaultItem): ArtifactRef {
  return {
    id: item.source_id,
    title: item.title,
    filename: item.filename,
    artifactType: item.artifact_type ?? 'html',
    sizeBytes: item.size_bytes ?? undefined,
  }
}

function facts(item: VaultItem, vaultIntl: IntlShape): [string, string][] {
  const rows: [string, string | null | undefined][] = [
    // The list's kind label for an asset file is its asset's name — here that is its own row.
    [vaultIntl.formatMessage({ id: 'vault.facts.Kind', defaultMessage: "Kind" }), item.kind === 'asset' ? vaultIntl.formatMessage({ id: 'vault.facts.Assetfile', defaultMessage: "Asset file" }) : kindLabel(item, vaultIntl)],
    [vaultIntl.formatMessage({ id: 'vault.facts.Account', defaultMessage: "Account" }), item.account_name],
    [vaultIntl.formatMessage({ id: 'vault.facts.Asset', defaultMessage: "Asset" }), item.asset_name],
    [vaultIntl.formatMessage({ id: 'vault.facts.Statementdate', defaultMessage: "Statement date" }), formatDay(item.statement_date)],
    [vaultIntl.formatMessage({ id: 'vault.facts.Transactiondate', defaultMessage: "Transaction date" }), formatDay(item.transaction_date)],
    [vaultIntl.formatMessage({ id: 'vault.facts.Added', defaultMessage: "Added" }), formatDay(item.added_at)],
    [vaultIntl.formatMessage({ id: 'vault.facts.Size', defaultMessage: "Size" }), formatSize(item.size_bytes)],
    [vaultIntl.formatMessage({ id: 'vault.facts.File', defaultMessage: "File" }), item.filename],
  ]
  return rows.filter((r): r is [string, string] => !!r[1])
}

export function VaultItemDetail({
  item,
  onBack,
  onClose,
  onOpenArtifact,
  onAsked,
  onTag,
}: {
  item: VaultItem
  onBack: () => void
  onClose: () => void
  onOpenArtifact: (a: ArtifactRef) => void
  onAsked?: () => void
  onTag?: (tag: string) => void
}) {
  const vaultIntl = useAppIntl()
  const pageRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // Fade the page at an edge with more to scroll to — re-measured as a preview loads and
  // the page grows (ResizeObserver on its parts), not only on scroll.
  useEffect(() => {
    const body = bodyRef.current
    markFades(body)
    if (!body || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => markFades(body))
    for (const part of Array.from(body.children)) observer.observe(part)
    return () => observer.disconnect()
  }, [item.id])
  // A swipe from the left edge goes back to the list, like any pushed iOS view.
  useEdgeSwipeBack(pageRef, onBack, isStandaloneApp())
  return (
    <div className="vault-detail" ref={pageRef}>
      <div className="vault-head">
        <button
          type="button"
          className="vault-icon-btn"
          onClick={onBack}
          aria-label={vaultIntl.formatMessage({ id: "vault.ui.76255d8e76f0", defaultMessage: "Back to Documents" })}
        >
          <ArrowLeft size={17} strokeWidth={1.7} />
        </button>
        <h2 className="vault-title vault-title--item">{item.title}</h2>
        <button
          type="button"
          className="vault-icon-btn"
          onClick={onClose}
          aria-label={vaultIntl.formatMessage({ id: "vault.ui.e16f6a089638", defaultMessage: "Close Documents" })}
        >
          <X size={18} strokeWidth={1.6} />
        </button>
      </div>
      <div className="vault-detail-body" ref={bodyRef} onScroll={(e) => markFades(e.currentTarget)}>
        <DocumentPreview item={item} onOpenArtifact={() => onOpenArtifact(artifactRef(item))} />
        <ActionBar item={item} artifact={artifactRef(item)} onAsked={onAsked} />
        {item.private && (
          <p className="vault-private-note">
            <Lock size={13} strokeWidth={1.8} aria-hidden="true" /> {vaultIntl.formatMessage({ id: "vault.ui.85740aa9af77", defaultMessage: "Private — Lucius can see this file’s name, note and tags, never what is in it." })}
          </p>
        )}
        {!!item.tags?.length && <TagsRow tags={item.tags} onTag={onTag} />}
        {item.note && <NoteCard note={item.note} />}
        <section className="vault-section">
          <h3 className="vault-section-title">{vaultIntl.formatMessage({ id: "vault.ui.45989de49fb7", defaultMessage: "Details" })}</h3>
          <dl className="vault-card">
            {facts(item, vaultIntl).map(([k, v]) => (
              <div key={k} className="vault-card-row vault-fact">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        {(item.kind === 'file' || item.kind === 'asset') && (
          // Keyed on the stored year: a saved change (or one made by Lucius) resets the input.
          <SettingsCard key={`${item.id}:${item.year ?? ''}`} item={item} />
        )}
        <ManageCard item={item} onRemoved={onBack} />
      </div>
    </div>
  )
}
