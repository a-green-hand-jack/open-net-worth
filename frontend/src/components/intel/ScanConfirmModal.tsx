import { useAppIntl } from '../../i18n/useAppIntl'
import { Button, Cluster, Modal, Text } from '../ui'

export function ScanConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const intl = useAppIntl()
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={intl.formatMessage({ id: 'intel.scanConfirm', defaultMessage: "Run intelligence scan?" })}
      size="sm"
      footer={
        <Cluster justify="end" gap="--space-2">
          <Button variant="ghost" onClick={onCancel}>
            {intl.formatMessage({ id: 'intel.cancel', defaultMessage: "Cancel" })}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {intl.formatMessage({ id: 'intel.scanNow', defaultMessage: "Scan now" })}
          </Button>
        </Cluster>
      }
    >
      <Text size="sm">
        {intl.formatMessage({ id: 'intel.scanCost', defaultMessage: "This scan makes external web-search API calls to fetch news and market signals for your watchlist. It counts against your search quota." })}
      </Text>
    </Modal>
  )
}
