import { useAppIntl } from '../../i18n/useAppIntl'
import { FormattedMessage } from './FormattedMessage'
import { Modal, Button, Text } from '../ui'

export interface ConfirmSpec {
  title: string
  body: string
  confirmLabel?: string
  onConfirm: () => void
}

export function ConfirmDialog({ spec, onCancel }: { spec: ConfirmSpec; onCancel: () => void }) {
  const intl = useAppIntl()
  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      title={spec.title}
      footer={
        <div className="intel-pa-footer-right">
          <Button variant="ghost" onClick={onCancel}>
            {<FormattedMessage id="intel.extra.51bac044" defaultMessage={"Cancel"} />}
          </Button>
          <Button variant="danger" onClick={spec.onConfirm}>
            {spec.confirmLabel ?? intl.formatMessage({ id: 'intel.visible.delete', defaultMessage: 'Delete' })}
          </Button>
        </div>
      }
    >
      <Text size="sm" tone="muted">
        {spec.body}
      </Text>
    </Modal>
  )
}
