import { useAppIntl } from '../../../i18n/useAppIntl'
import { templateField } from './templateMessages'
import { Clock3, Zap } from 'lucide-react'
import type { Automation } from '../../../api/automations'
import { AutomationMenu } from './AutomationMenu'
import { automationTriggerLabel, type AutomationOptions } from './AutomationTriggerSummary'

export function AutomationCard({
  automation,
  options,
  busy,
  onOpen,
  onRunNow,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  automation: Automation
  options?: AutomationOptions
  busy?: boolean
  onOpen: () => void
  onRunNow: () => void
  onToggle: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const name = templateField(intl, 'name', automation.name, automation.template_source?.name)
  const savedDescription = templateField(
    intl,
    'description',
    automation.description,
    automation.template_source?.description,
  )
  const paused = automation.status === 'paused'
  const finished = automation.status === 'completed'
  const description =
    savedDescription.trim() ||
    firstSentence(automation.instructions) ||
    formatMessage({ id: 'automations.noDescription', defaultMessage: 'No description yet.' })
  const mailStarter = paused && automation.provenance.system_key === 'mail_ledger'
  const TriggerIcon = automation.trigger.kind === 'event' ? Zap : Clock3
  // Lucius entity wiring: `automation` is a registered mention type, but this card never
  // emitted the attributes, so an automation could be @-mentioned and nothing else — not
  // dragged into the dock, not right-clicked "Ask Lucius". DragRightClick binds globally on
  // [data-entity-id][draggable], so the attributes below ARE the wiring.
  return (
    <article
      className={`a3-row${paused || finished ? ' off' : ''}`}
      aria-label={name}
      data-od-id={`automation-row-${automation.id}`}
      data-entity-id={`automation:${automation.id}`}
      data-entity-label={name}
      draggable
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen()
      }}
    >
      <span className="a3-row-body">
        <span className="a3-row-title">
          <span className="t">{name}</span>
          {paused && (
            <span className="a3-tag warn">
              {formatMessage({ id: 'automations.paused', defaultMessage: 'Paused' })}
            </span>
          )}
          {finished && (
            <span className="a3-tag">
              {formatMessage({ id: 'automations.finished', defaultMessage: 'Finished' })}
            </span>
          )}
        </span>
        <span className="a3-row-blurb">
          {mailStarter
            ? formatMessage({
                id: 'automations.mailStarter',
                defaultMessage:
                  'Starter only. Connect Email and review its settings before enabling.',
              })
            : description}
        </span>
        <span
          className={`a3-when${paused || finished ? ' off' : ''}${automation.trigger.kind === 'event' ? ' evt' : ''}`}
        >
          <TriggerIcon size={13} strokeWidth={1.7} aria-hidden="true" />
          {automationTriggerLabel(automation.trigger, options, intl)}
        </span>
      </span>
      <span className="a3-row-right" onClick={(event) => event.stopPropagation()}>
        <AutomationMenu
          items={[
            {
              label: formatMessage({ id: 'automations.runNow', defaultMessage: 'Run now' }),
              disabled: busy,
              onSelect: onRunNow,
            },
            ...(finished
              ? []
              : [
                  {
                    label: paused
                      ? formatMessage({ id: 'automations.resume', defaultMessage: 'Resume' })
                      : formatMessage({ id: 'automations.pause', defaultMessage: 'Pause' }),
                    disabled: busy,
                    onSelect: onToggle,
                  },
                ]),
            {
              label: finished
                ? formatMessage({
                    id: 'automations.editAgain',
                    defaultMessage: 'Edit to run again',
                  })
                : formatMessage({ id: 'automations.edit', defaultMessage: 'Edit' }),
              onSelect: onEdit,
            },
            {
              label: formatMessage({ id: 'automations.duplicate', defaultMessage: 'Duplicate' }),
              onSelect: onDuplicate,
            },
            {
              label: formatMessage({ id: 'automations.delete', defaultMessage: 'Delete' }),
              danger: true,
              onSelect: onDelete,
            },
          ]}
        />
      </span>
    </article>
  )
}

function firstSentence(value: string) {
  return (value.trim().split(/(?<=[.!?])\s|\n/)[0] ?? '').trim()
}
