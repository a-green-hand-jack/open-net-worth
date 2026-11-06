// budgetLens/SwitchMethodModal.tsx — the ONE confirmation every method switch goes through
// (the method menu stages it via useBudgetLens.requestSwitch; nothing POSTs a switch directly).
// Copy ported from the Budget Onboarding (cards) design's switch modal (owner, 2026-09-25):
// switching is non-destructive — the outgoing method's setup is kept, so it says so.
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { Button, Modal } from '../../../ui'
import { methodById } from './methodsData'
import type { BudgetLensState } from './useBudgetLens'

export function SwitchMethodModal({ lens }: { lens: BudgetLensState }) {
  const { formatMessage } = useAppIntl()
  const to = methodById(lens.switchTo)
  const fromName =
    methodById(lens.homeId)?.name ?? lens.engines.find((e) => e.id === lens.homeId)?.name
  const displayName = (id: string, name: string | undefined) =>
    id === 'zero_based'
      ? formatMessage({ id: 'plan.zeroBased', defaultMessage: 'Zero-Based' })
      : (name ?? '')
  // "Back" — this method was set up before, so its own setup is waiting as it was left.
  const back = !!to && !!lens.engines.find((e) => e.id === to.id)?.configured
  return (
    <Modal
      open={!!to}
      onClose={lens.cancelSwitch}
      size="sm"
      title={
        to
          ? back
            ? formatMessage(
                { id: 'plan.switchBackTitle', defaultMessage: 'Switch back to {method}?' },
                { method: displayName(to.id, to.name) },
              )
            : formatMessage(
                { id: 'plan.switchTitle', defaultMessage: 'Switch to {method}?' },
                { method: displayName(to.id, to.name) },
              )
          : ''
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={lens.cancelSwitch}>
            {formatMessage({ id: 'plan.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button variant="primary" size="sm" loading={lens.switching} onClick={lens.confirmSwitch}>
            {formatMessage({ id: 'plan.switch', defaultMessage: 'Switch' })}
          </Button>
        </>
      }
    >
      {to && (
        <div className="bo-switch">
          <p className="bo-switch-p">
            {back
              ? to.id === 'proportional'
                ? formatMessage(
                    {
                      id: 'plan.switchBackProportional',
                      defaultMessage:
                        'Your split and caps are as you left them. Your {method} setup stays saved — you can switch back any time.',
                    },
                    { method: displayName(lens.homeId, fromName) },
                  )
                : formatMessage(
                    {
                      id: 'plan.switchBackZero',
                      defaultMessage:
                        'Your assignments and targets are as you left them. Your {method} setup stays saved — you can switch back any time.',
                    },
                    { method: displayName(lens.homeId, fromName) },
                  )
              : to.id === 'zero_based'
                ? formatMessage(
                    {
                      id: 'plan.switchNewZero',
                      defaultMessage:
                        'Your envelopes and categories come with you. Nothing is assigned yet. Your {method} setup stays saved — switch back any time.',
                    },
                    { method: displayName(lens.homeId, fromName) },
                  )
                : formatMessage(
                    {
                      id: 'plan.switchNewProportional',
                      defaultMessage:
                        'Your envelopes and categories come with you. You’ll set your income and each group’s share next. Your {method} setup stays saved — switch back any time.',
                    },
                    { method: displayName(lens.homeId, fromName) },
                  )}
          </p>
        </div>
      )}
    </Modal>
  )
}
