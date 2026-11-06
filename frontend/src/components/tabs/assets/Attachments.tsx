// The asset page's "Documents" sub-tab — the documents and photos that go with the asset: a
// purchase agreement, receipts, a warranty. Add files with the button or by dropping them on the
// page (docUpload.ts); rename one; write a note on one (the note Documents shows too); remove
// one (it asks first: the file itself is deleted too, and that can't be undone — RFC §3.9);
// choose whether Lucius may read each.
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { defineMessages } from 'react-intl'
import { useIsMobile } from '../../../hooks/useIsMobile'
import type { AssetDoc, OwnedAsset } from '../../../types/assets'
import {
  ActionMenu,
  Button,
  Cluster,
  ConfirmDialog,
  EmptyState,
  FormField,
  Modal,
  Stack,
  Switch,
  Text,
  TextField,
} from '../../ui'
import { MoreVertical } from '../../../ui/icons'
import * as api from './api'
import { monthYear } from './assetsData'
import { AttachmentViewer, docFileUrl, isImageDoc } from './AttachmentViewer'
import { AttachmentNoteDialog } from './AttachmentNoteDialog'
import { useDocUpload, type DocUpload } from './docUpload'
import { EditorFooter, SaveError, useEditorSave } from './editorKit'
import { Icons } from './icons'
import { useAppIntl } from '../../../i18n/useAppIntl'

/** What the server can read — images, statements and spreadsheets (RFC §3.9). */
const ACCEPT = 'image/*,.pdf,.csv,.xls,.xlsx,.ofx,.qfx,.qif'

/** A file row's menu — the same vertical ⋮ as the file's row in Documents. */
const KEBAB = <MoreVertical size={18} aria-hidden="true" />

const documentHints = defineMessages({
  property: {
    id: 'assets.docs.hint.property',
    defaultMessage:
      'Keep its documents here — the purchase agreement, title deed, receipts and photos.',
  },
  vehicle: {
    id: 'assets.docs.hint.vehicle',
    defaultMessage:
      'Keep its documents here — registration, insurance, service records and photos.',
  },
  watch: {
    id: 'assets.docs.hint.watch',
    defaultMessage:
      'Keep its documents here — box and papers, certificates, the receipt and photos.',
  },
  art: {
    id: 'assets.docs.hint.art',
    defaultMessage:
      'Keep its documents here — certificate of authenticity, invoice, provenance and photos.',
  },
  metal: {
    id: 'assets.docs.hint.metal',
    defaultMessage:
      'Keep its documents here — purchase invoices, assay certificates and storage statements.',
  },
  policy: {
    id: 'assets.docs.hint.policy',
    defaultMessage: 'Keep its documents here — the policy contract and each annual statement.',
  },
  other: {
    id: 'assets.docs.hint.other',
    defaultMessage: 'Keep its documents here — contracts, receipts, warranties and photos.',
  },
})

export interface AttachmentsProps {
  a: OwnedAsset
  /** The page's upload, shared with a drop on the page; the tab keeps its own without one. */
  upload?: DocUpload
  onToast(message: string): void
}

interface DocsTableProps {
  a: OwnedAsset
  onOpen(doc: AssetDoc): void
  onToggle(doc: AssetDoc, readable: boolean): void
  onRename(doc: AssetDoc): void
  onNote(doc: AssetDoc): void
  onRemove(doc: AssetDoc): void
}

function noteItem(
  doc: AssetDoc,
  onNote: (doc: AssetDoc) => void,
  intl: ReturnType<typeof useAppIntl>,
) {
  return {
    label: doc.note
      ? intl.formatMessage({ id: 'assets.docs.editNote', defaultMessage: 'Edit note' })
      : intl.formatMessage({ id: 'assets.docs.addNote', defaultMessage: 'Add a note' }),
    onSelect: () => onNote(doc),
  }
}

// An image shows itself; anything else, the file icon in a box of the same size, so every
// name starts at the same place.
function DocThumb({ doc }: { doc: AssetDoc }) {
  if (!isImageDoc(doc))
    return <span className="as-doc-thumb as-doc-thumb-icon">{Icons.doc!()}</span>
  return <img className="as-doc-thumb" src={docFileUrl(doc)} alt="" loading="lazy" />
}

/** Each row opens its file; the switch and the ⋮ menu are their own controls. */
function DocsTable({ a, onOpen, onToggle, onRename, onNote, onRemove }: DocsTableProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  return (
    <div className="as-tbl-wrap">
      <div className="as-tbl-scroll">
        <table className="as-tbl" style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th className="l">
                {formatMessage({ id: 'assets.docs.file', defaultMessage: 'File' })}
              </th>
              <th>{formatMessage({ id: 'assets.docs.added', defaultMessage: 'Added' })}</th>
              <th style={{ textAlign: 'right' }}>
                {formatMessage({ id: 'assets.docs.readable', defaultMessage: 'Lucius can read' })}
              </th>
              <th>
                <span className="ui-visually-hidden">
                  {formatMessage({ id: 'assets.docs.actions', defaultMessage: 'Actions' })}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {a.docs.map((d) => (
              <tr key={d.ref_id} className="data" onClick={() => onOpen(d)}>
                <td className="l">
                  <button
                    type="button"
                    className="as-doc-open as-tname"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(d)
                    }}
                  >
                    <DocThumb doc={d} />
                    <span className="as-doc-name">
                      <span>{d.name}</span>
                      {d.note && <span className="as-doc-note">{d.note}</span>}
                    </span>
                  </button>
                </td>
                <td className="dim">{monthYear(d.added_on)}</td>
                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <Switch
                    aria-label={formatMessage(
                      { id: 'assets.docs.readableName', defaultMessage: 'Lucius can read {name}' },
                      { name: d.name },
                    )}
                    checked={d.lucius_readable}
                    onChange={(e) => onToggle(d, e.target.checked)}
                  />
                </td>
                <td className="as-doc-menu" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    className="as-doc-kebab"
                    label={formatMessage(
                      { id: 'assets.docs.more', defaultMessage: 'More actions for {name}' },
                      { name: d.name },
                    )}
                    trigger={KEBAB}
                    items={[
                      {
                        label: formatMessage({
                          id: 'assets.docs.rename',
                          defaultMessage: 'Rename',
                        }),
                        onSelect: () => onRename(d),
                      },
                      noteItem(d, onNote, intl),
                      {
                        label: formatMessage({
                          id: 'assets.docs.remove',
                          defaultMessage: 'Remove',
                        }),
                        tone: 'danger',
                        onSelect: () => onRemove(d),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface RenameFileDialogProps {
  a: OwnedAsset
  doc: AssetDoc
  onClose(): void
  onRenamed(): void
}

/** Phone: each file is one row that opens it — its note, date and whether Lucius reads it under
 *  the name, and every other control in its ⋯ menu (a table would scroll them out of reach). */
function DocsList({ a, onOpen, onToggle, onRename, onNote, onRemove }: DocsTableProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  return (
    <div className="as-doc-list">
      {a.docs.map((d) => (
        <div key={d.ref_id} className="as-doc-list-row">
          <button type="button" className="as-doc-open as-doc-list-main" onClick={() => onOpen(d)}>
            <DocThumb doc={d} />
            <span className="as-doc-list-text">
              <Text size="sm" weight={600} truncate>
                {d.name}
              </Text>
              {d.note && (
                <Text size="xs" tone="faint" truncate>
                  {d.note}
                </Text>
              )}
              <Text size="xs" tone="faint">
                {monthYear(d.added_on)} ·{' '}
                {d.lucius_readable
                  ? formatMessage({ id: 'assets.docs.readable', defaultMessage: 'Lucius can read' })
                  : formatMessage({
                      id: 'assets.docs.unreadable',
                      defaultMessage: 'Lucius can’t read',
                    })}
              </Text>
            </span>
          </button>
          <ActionMenu
            className="as-doc-kebab"
            label={formatMessage(
              { id: 'assets.docs.more', defaultMessage: 'More actions for {name}' },
              { name: d.name },
            )}
            trigger={KEBAB}
            items={[
              {
                label: formatMessage({ id: 'assets.docs.rename', defaultMessage: 'Rename' }),
                onSelect: () => onRename(d),
              },
              noteItem(d, onNote, intl),
              {
                label: d.lucius_readable
                  ? formatMessage({
                      id: 'assets.docs.disallow',
                      defaultMessage: 'Don’t let Lucius read it',
                    })
                  : formatMessage({
                      id: 'assets.docs.allow',
                      defaultMessage: 'Let Lucius read it',
                    }),
                onSelect: () => onToggle(d, !d.lucius_readable),
              },
              {
                label: formatMessage({ id: 'assets.docs.remove', defaultMessage: 'Remove' }),
                tone: 'danger',
                onSelect: () => onRemove(d),
              },
            ]}
          />
        </div>
      ))}
    </div>
  )
}

/** "Rename file" — the name it goes by here and in Documents (the file itself is untouched). */
function RenameFileDialog({ a, doc, onClose, onRenamed }: RenameFileDialogProps) {
  const { formatMessage } = useAppIntl()
  const id = useId()
  const [name, setName] = useState(doc.name)
  const { saving, save, check, errorFor, edited, dialogError } = useEditorSave()

  async function onSave() {
    const clean = name.split(/\s+/).filter(Boolean).join(' ')
    if (
      !check({
        name: clean
          ? undefined
          : formatMessage({ id: 'assets.docs.enterName', defaultMessage: 'Enter a name.' }),
      })
    )
      return
    if (clean === doc.name) return onClose()
    if (await save(() => api.updateDoc(a.id, doc.ref_id, { name: clean }))) onRenamed()
  }

  return (
    <Modal
      className="as-modal"
      open
      onClose={onClose}
      title={formatMessage({ id: 'assets.docs.renameFile', defaultMessage: 'Rename file' })}
      subtitle={a.name}
      size="sm"
      footer={
        <EditorFooter
          saving={saving}
          label={formatMessage({ id: 'assets.docs.save', defaultMessage: 'Save' })}
          onCancel={onClose}
          onSave={onSave}
        />
      }
    >
      <Stack gap="--space-6">
        <FormField
          label={formatMessage({ id: 'assets.docs.name', defaultMessage: 'Name' })}
          htmlFor={`${id}-name`}
          required
          error={errorFor('name')}
        >
          <TextField
            id={`${id}-name`}
            autoFocus
            invalid={!!errorFor('name')}
            value={name}
            maxLength={api.TEXT_CAPS.docName}
            // The whole name: it is a label (the file keeps its own name), so typing replaces it.
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setName(e.target.value)
              edited('name')
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              void onSave()
            }}
          />
        </FormField>
        <SaveError message={dialogError(['name'])} />
      </Stack>
    </Modal>
  )
}

interface RemoveFileConfirmProps {
  a: OwnedAsset
  doc: AssetDoc
  onClose(): void
  onRemoved(): void
}

/** "Remove this file?" — it waits for the server and says why a refusal refused. */
function RemoveFileConfirm({ a, doc, onClose, onRemoved }: RemoveFileConfirmProps) {
  const { formatMessage } = useAppIntl()
  const { saving, save, dialogError } = useEditorSave()
  async function confirm() {
    if (await save(() => api.removeDoc(a.id, doc.ref_id))) onRemoved()
  }
  return (
    <ConfirmDialog
      data={{
        title: formatMessage({
          id: 'assets.docs.removeTitle',
          defaultMessage: 'Remove this file?',
        }),
        body: (
          <>
            {formatMessage(
              {
                id: 'assets.docs.removeBody',
                defaultMessage: '{name} will be removed from this asset.',
              },
              { name: doc.name },
            )}
            <SaveError message={dialogError([])} />
          </>
        ),
        confirmLabel: saving
          ? formatMessage({ id: 'assets.docs.removing', defaultMessage: 'Removing…' })
          : formatMessage({ id: 'assets.docs.remove', defaultMessage: 'Remove' }),
        danger: true,
        confirmDisabled: saving,
      }}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    />
  )
}

export function Attachments({ a, upload: shared, onToast }: AttachmentsProps) {
  const { formatMessage } = useAppIntl()
  const fileRef = useRef<HTMLInputElement>(null)
  const own = useDocUpload(a, onToast)
  const upload = shared ?? own
  const isMobile = useIsMobile()
  const [viewing, setViewing] = useState<AssetDoc | null>(null)
  const [renaming, setRenaming] = useState<AssetDoc | null>(null)
  const [noting, setNoting] = useState<AssetDoc | null>(null)
  const [removing, setRemoving] = useState<AssetDoc | null>(null)

  function add(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    // Cleared at once, so choosing the same file again still fires a change.
    e.target.value = ''
    void upload.addFiles(files)
  }

  async function toggle(doc: AssetDoc, readable: boolean) {
    try {
      await api.updateDoc(a.id, doc.ref_id, { lucius_readable: readable })
    } catch (e) {
      onToast(
        e instanceof Error
          ? e.message
          : formatMessage({
              id: 'assets.docs.saveFailed',
              defaultMessage: "That didn't save. Try again.",
            }),
      )
    }
  }

  const addFile = (
    <Button
      variant="secondary"
      size="sm"
      disabled={upload.saving}
      onClick={() => fileRef.current?.click()}
    >
      {upload.saving
        ? formatMessage({ id: 'assets.docs.adding', defaultMessage: 'Adding…' })
        : formatMessage({ id: 'assets.docs.addFile', defaultMessage: 'Add file' })}
    </Button>
  )
  const docControls: DocsTableProps = {
    a,
    onOpen: setViewing,
    onToggle: (d, readable) => void toggle(d, readable),
    onRename: setRenaming,
    onNote: setNoting,
    onRemove: setRemoving,
  }
  // Only where a mouse can drag a file here — never on a phone.
  const dropHint = (
    <Text as="span" size="xs" tone="faint" className="as-drop-hint">
      {formatMessage({ id: 'assets.docs.drop', defaultMessage: 'or drop files on this page' })}
    </Text>
  )

  return (
    <>
      <Stack gap="--space-4" className="as-tab-panel">
        <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={add} />
        {a.docs.length > 0 ? (
          <>
            {isMobile ? <DocsList {...docControls} /> : <DocsTable {...docControls} />}
            <SaveError message={upload.error} />
            {/* Under the files, where the next one goes (owner, 2026-09-28). */}
            <Cluster gap="--space-3">
              {addFile}
              {dropHint}
            </Cluster>
          </>
        ) : (
          <>
            <div className="as-tbl-wrap">
              <EmptyState
                title={formatMessage({
                  id: 'assets.docs.empty',
                  defaultMessage: 'No documents yet',
                })}
                body={formatMessage(
                  documentHints[a.category as keyof typeof documentHints] ?? documentHints.other,
                )}
                action={
                  <Stack gap="--space-2" align="center">
                    {addFile}
                    {dropHint}
                  </Stack>
                }
              />
            </div>
            <SaveError message={upload.error} />
          </>
        )}
      </Stack>
      {viewing && <AttachmentViewer a={a} doc={viewing} onClose={() => setViewing(null)} />}
      {renaming && (
        <RenameFileDialog
          a={a}
          doc={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={() => {
            setRenaming(null)
            onToast(formatMessage({ id: 'assets.docs.renamed', defaultMessage: 'File renamed.' }))
          }}
        />
      )}
      {noting && (
        <AttachmentNoteDialog
          a={a}
          doc={noting}
          onClose={() => setNoting(null)}
          onSaved={(removed) => {
            setNoting(null)
            onToast(
              removed
                ? formatMessage({ id: 'assets.docs.noteRemoved', defaultMessage: 'Note removed.' })
                : formatMessage({ id: 'assets.docs.noteSaved', defaultMessage: 'Note saved.' }),
            )
          }}
        />
      )}
      {removing && (
        <RemoveFileConfirm
          a={a}
          doc={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null)
            onToast(formatMessage({ id: 'assets.docs.removed', defaultMessage: 'File removed.' }))
          }}
        />
      )}
    </>
  )
}
