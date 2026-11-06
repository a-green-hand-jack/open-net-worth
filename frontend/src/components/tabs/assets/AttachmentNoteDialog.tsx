// A note on one of the asset's files — the same note Documents shows beside it (owner: "can't
// see the note field in the asset detail"). Saved through the asset's own file update; saving
// it empty, or Remove note, deletes it.
import { useId, useState } from 'react'
import { useCaretAtEnd } from '../../../hooks/useCaretAtEnd'
import type { AssetDoc, OwnedAsset } from '../../../types/assets'
import { Button, FormField, Modal, Stack, TextArea } from '../../ui'
import * as api from './api'
import { EditorFooter, SaveError, useEditorSave } from './editorKit'
import { useAppIntl } from '../../../i18n/useAppIntl'

interface AttachmentNoteDialogProps {
  a: OwnedAsset
  doc: AssetDoc
  onClose(): void
  onSaved(removed: boolean): void
}

export function AttachmentNoteDialog({ a, doc, onClose, onSaved }: AttachmentNoteDialogProps) {
  const { formatMessage } = useAppIntl()
  const id = useId()
  const [note, setNote] = useState(doc.note ?? '')
  const { saving, save, errorFor, edited, dialogError } = useEditorSave()
  const caretAtEnd = useCaretAtEnd()

  async function write(next: string | null) {
    if (next === (doc.note ?? null)) return onClose()
    if (await save(() => api.updateDoc(a.id, doc.ref_id, { note: next }))) onSaved(next === null)
  }
  const onSave = () => void write(note.trim() || null)

  return (
    <Modal
      className="as-modal"
      open
      onClose={onClose}
      title={
        doc.note
          ? formatMessage({ id: 'assets.docs.editNote', defaultMessage: 'Edit note' })
          : formatMessage({ id: 'assets.docs.addNote', defaultMessage: 'Add a note' })
      }
      subtitle={doc.name}
      size="sm"
      footer={
        <EditorFooter
          start={
            doc.note ? (
              <Button
                variant="ghost"
                size="sm"
                className="as-footer-danger"
                disabled={saving}
                onClick={() => void write(null)}
              >
                {formatMessage({ id: 'assets.docs.removeNote', defaultMessage: 'Remove note' })}
              </Button>
            ) : null
          }
          saving={saving}
          label={formatMessage({ id: 'assets.docs.save', defaultMessage: 'Save' })}
          onCancel={onClose}
          onSave={onSave}
        />
      }
    >
      <Stack gap="--space-6">
        <FormField
          label={formatMessage({ id: 'assets.docs.note', defaultMessage: 'Note' })}
          htmlFor={`${id}-note`}
          error={errorFor('doc_note')}
          help={
            doc.lucius_readable
              ? formatMessage({
                  id: 'assets.docs.noteReadable',
                  defaultMessage: 'Lucius reads your note when you ask about this file.',
                })
              : formatMessage({
                  id: 'assets.docs.noteStillReadable',
                  defaultMessage:
                    'Lucius can still read this note. The switch keeps only the file itself from Lucius.',
                })
          }
        >
          <TextArea
            id={`${id}-note`}
            autoFocus
            onFocus={caretAtEnd}
            rows={5}
            value={note}
            maxLength={api.TEXT_CAPS.docNote}
            placeholder={formatMessage({
              id: 'assets.docs.notePlaceholder',
              defaultMessage: 'e.g. Signed copy. The original is in the safe.',
            })}
            invalid={!!errorFor('doc_note')}
            onChange={(e) => {
              setNote(e.target.value)
              edited('doc_note')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave()
            }}
          />
        </FormField>
        <SaveError message={dialogError(['doc_note'])} />
      </Stack>
    </Modal>
  )
}
