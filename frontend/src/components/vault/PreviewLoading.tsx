import { useAppIntl } from '../../i18n/useAppIntl'
/** What every previewer shows while a file is still on its way — a blank frame read as
 *  "there is nothing here" (owner, 2026-10-26). */
export function PreviewLoading({ label }: { label?: string }) {
  const intl = useAppIntl()
  return (
    <div className="vault-preview-loading" role="status">
      <span className="vault-preview-spin" aria-hidden="true" />
      {label ?? intl.formatMessage({ id: 'vault.loadingFile', defaultMessage: 'Loading the file…' })}
    </div>
  )
}
