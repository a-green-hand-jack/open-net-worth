import { useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { Button, ConfirmDialog, Modal, TextField } from '../../ui'
import { Pencil, Trash2 } from '../../../ui/icons'
import type { InstitutionOption } from './ds'

export interface InstitutionDeleteResult {
  id: string
  unlinked_account_count: number
  unlinked_account_ids: string[]
}

interface InstitutionManagerProps {
  open: boolean
  institutions: InstitutionOption[]
  onClose: () => void
  onRename: (id: string, name: string) => Promise<InstitutionOption>
  onDelete: (id: string) => Promise<InstitutionDeleteResult>
  onRenamed?: (previous: InstitutionOption, renamed: InstitutionOption) => void
  onDeleted?: (result: InstitutionDeleteResult) => void
}

export function InstitutionManager({
  open,
  institutions,
  onClose,
  onRename,
  onDelete,
  onRenamed,
  onDeleted,
}: InstitutionManagerProps) {
  const { formatMessage } = useAppIntl()
  const accountsLine = (institution: InstitutionOption) => institution.accountNames?.length ? institution.accountNames.join(', ') : formatMessage({ id: 'accounts.institution.count', defaultMessage: '{count, plural, one {# account} other {# accounts}}' }, { count: institution.accountCount })
  const [editing, setEditing] = useState<InstitutionOption | null>(null)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<InstitutionOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const startRename = (institution: InstitutionOption) => {
    setEditing(institution)
    setName(institution.name)
    setError('')
  }
  const saveRename = async () => {
    if (!editing) return
    setBusy(true)
    setError('')
    try {
      const renamed = await onRename(editing.id, name)
      onRenamed?.(editing, renamed)
      setEditing(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : formatMessage({ id: 'accounts.institution.renameError', defaultMessage: "Could not rename institution" }))
    } finally {
      setBusy(false)
    }
  }
  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setError('')
    try {
      const result = await onDelete(deleting.id)
      onDeleted?.(result)
      setDeleting(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : formatMessage({ id: 'accounts.institution.deleteError', defaultMessage: "Could not delete institution" }))
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={formatMessage({ id: 'accounts.institution.title', defaultMessage: "Manage institutions" })} size="md">
        <div className="acct-inst-manager">
          <p className="acct-inst-manager-copy">
            {formatMessage({ id: 'accounts.institution.explanation', defaultMessage: 'Rename a shared institution, or remove it from the saved list. Deleting only unlinks accounts; it never deletes account data.' })}
          </p>
          {error && (
            <p className="acct-inst-manager-error" role="alert">
              {error}
            </p>
          )}
          {institutions.length === 0 ? (
            <p className="acct-inst-manager-empty">{formatMessage({ id: 'accounts.institution.empty', defaultMessage: "No saved institutions yet." })}</p>
          ) : (
            <div className="acct-inst-manager-list">
              {institutions.map((institution) => (
                <div className="acct-inst-manager-row" key={institution.id}>
                  {editing?.id === institution.id ? (
                    <div className="acct-inst-manager-edit">
                      <TextField
                        aria-label={formatMessage({ id: 'accounts.institution.nameFor', defaultMessage: 'Institution name for {name}' }, { name: institution.name })}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoFocus
                      />
                      <div className="acct-inst-manager-actions">
                        <Button size="sm" onClick={() => void saveRename()} disabled={busy}>
                          {formatMessage({ id: 'accounts.institution.save', defaultMessage: "Save" })}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                          disabled={busy}
                        >
                          {formatMessage({ id: 'accounts.institution.cancel', defaultMessage: "Cancel" })}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="acct-inst-manager-main">
                        <div className="acct-inst-manager-name">{institution.name}</div>
                        <div
                          className="acct-inst-manager-count"
                          title={institution.accountNames?.join(', ') || undefined}
                        >
                          {accountsLine(institution)}
                        </div>
                      </div>
                      <div className="acct-inst-manager-actions">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="acct-inst-manager-icon"
                          aria-label={formatMessage({ id: 'accounts.institution.renameName', defaultMessage: 'Rename {name}' }, { name: institution.name })}
                          title={formatMessage({ id: 'accounts.institution.rename', defaultMessage: "Rename" })}
                          onClick={() => startRename(institution)}
                        >
                          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="acct-inst-manager-icon acct-inst-manager-delete"
                          aria-label={formatMessage({ id: 'accounts.institution.deleteName', defaultMessage: 'Delete {name}' }, { name: institution.name })}
                          title={formatMessage({ id: 'accounts.institution.delete', defaultMessage: "Delete" })}
                          onClick={() => setDeleting(institution)}
                        >
                          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        data={
          deleting
            ? {
                title: formatMessage({ id: 'accounts.institution.deleteQuestion', defaultMessage: 'Delete {name}?' }, { name: deleting.name }),
                body: formatMessage({ id: 'accounts.institution.deleteExplanation', defaultMessage: 'This removes it from {count, plural, one {# account} other {# accounts}}. The accounts, balances, and transactions stay intact.' }, { count: deleting.accountCount }),
                confirmLabel: formatMessage({ id: 'accounts.institution.confirm', defaultMessage: "Unlink and delete" }),
                danger: true,
                confirmDisabled: busy,
              }
            : null
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
