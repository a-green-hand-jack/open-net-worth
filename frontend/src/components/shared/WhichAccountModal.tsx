import { useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { Button, Cluster, Modal, Select } from '../ui'
import { ArrowRight } from '../../ui/icons'

export interface WriteTarget {
  positionId: string
  accountId: string
  accountName: string
}

interface Props {
  targets: WriteTarget[]
  onPick: (target: WriteTarget) => void
  onClose: () => void
}

export function WhichAccountModal({ targets, onPick, onClose }: Props) {
  const { formatMessage } = useAppIntl()
  const only = targets[0]
  const [chosen, setChosen] = useState(targets.length === 1 && only ? only.positionId : '')
  const selected = targets.find((t) => t.positionId === chosen)
  return (
    <Modal
      open
      onClose={onClose}
      title={formatMessage({ id: 'shared.whichAccount.title', defaultMessage: 'Which account?' })}
      size="sm"
      footer={
        <Cluster justify="end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {formatMessage({ id: 'shared.whichAccount.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!selected}
            onClick={() => selected && onPick(selected)}
          >
            {formatMessage({ id: 'shared.whichAccount.continue', defaultMessage: 'Continue' })}
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </Cluster>
      }
    >
      <p className="ui-confirm-body">
        {formatMessage({
          id: 'shared.whichAccount.help',
          defaultMessage: 'This holding spans multiple accounts. Choose the one to record against.',
        })}
      </p>
      <label className="disposal-deposit">
        {formatMessage({ id: 'shared.whichAccount.account', defaultMessage: 'Account' })}
        <Select
          placeholder={formatMessage({
            id: 'shared.whichAccount.choose',
            defaultMessage: 'Choose account…',
          })}
          options={targets.map((t) => ({ value: t.positionId, label: t.accountName }))}
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
        />
      </label>
    </Modal>
  )
}
