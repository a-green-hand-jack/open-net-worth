import { useAppIntl } from '../../../i18n/useAppIntl'
import { templateText } from './templateMessages'
import { useState } from 'react'
import { CalendarDays, Clock3, Zap } from 'lucide-react'
import type { AutomationDraft } from '../../../api/automations'
import { automationTriggerLabel, type AutomationOptions } from './AutomationTriggerSummary'
import {
  AUTOMATION_TEMPLATES,
  CONNECTOR_SYNC_TEMPLATES,
  RECOMMENDED_TEMPLATES,
  TEMPLATE_ICONS,
  type AutomationTemplate,
} from './automationTemplates'

type OnTemplate = (template: AutomationDraft) => void

export function TemplateGallery({
  options,
  onTemplate,
}: {
  options?: AutomationOptions
  onTemplate: OnTemplate
}) {
  const { formatMessage } = useAppIntl()
  const [showAll, setShowAll] = useState(false)
  return (
    <>
      <TemplateSection
        id="recommended-templates-heading"
        title={formatMessage({
          id: 'automations.templates.recommended',
          defaultMessage: 'Recommended',
        })}
        gridId="recommended-template-grid"
        templates={RECOMMENDED_TEMPLATES}
        options={options}
        onTemplate={onTemplate}
      />
      <TemplateSection
        id="connector-sync-templates-heading"
        title={formatMessage({
          id: 'automations.templates.syncConnector',
          defaultMessage: 'Sync a connector',
        })}
        gridId="connector-template-grid"
        templates={CONNECTOR_SYNC_TEMPLATES}
        options={options}
        onTemplate={onTemplate}
      />
      <TemplateSection
        id="automation-templates-heading"
        title={formatMessage({
          id: 'automations.templates.start',
          defaultMessage: 'Start from a template',
        })}
        gridId="template-grid"
        templates={showAll ? AUTOMATION_TEMPLATES : AUTOMATION_TEMPLATES.slice(0, 4)}
        options={options}
        onTemplate={onTemplate}
      >
        <button type="button" className="a3-linkbtn" onClick={() => setShowAll((value) => !value)}>
          {showAll
            ? formatMessage({
                id: 'automations.templates.fewer',
                defaultMessage: 'Show fewer templates',
              })
            : formatMessage({
                id: 'automations.templates.browse',
                defaultMessage: 'Browse all templates',
              })}
        </button>
      </TemplateSection>
    </>
  )
}

function TemplateSection({
  id,
  title,
  gridId,
  templates,
  options,
  onTemplate,
  children,
}: {
  id: string
  title: string
  gridId: string
  templates: AutomationTemplate[]
  options?: AutomationOptions
  onTemplate: OnTemplate
  children?: React.ReactNode
}) {
  return (
    <section className="a3-tpl-section" aria-labelledby={id}>
      <div className="a3-sec-label" id={id}>
        {title}
        <span className="rule" />
      </div>
      <div className="a3-tpl-grid" data-od-id={gridId}>
        {templates.map((template) => (
          <TemplateCard
            key={template.key}
            template={template}
            options={options}
            onTemplate={onTemplate}
          />
        ))}
      </div>
      {children}
    </section>
  )
}

function TemplateCard({
  template,
  options,
  onTemplate,
}: {
  template: AutomationTemplate
  options?: AutomationOptions
  onTemplate: OnTemplate
}) {
  const intl = useAppIntl()
  const text = templateText(intl, template)
  const Icon = TEMPLATE_ICONS[template.key] ?? CalendarDays
  const TriggerIcon = template.trigger.kind === 'event' ? Zap : Clock3
  return (
    <button
      type="button"
      className="a3-tpl"
      aria-label={intl.formatMessage(
        { id: 'automations.templates.label', defaultMessage: '{name} template' },
        { name: text.name },
      )}
      onClick={() =>
        onTemplate({
          ...template,
          template_source: {
            name: template.key,
            description: template.key,
            instructions: template.key,
          },
        })
      }
    >
      <span className="a3-tpl-ic">
        <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span className="a3-tpl-body">
        <span className="a3-tpl-title">{text.name}</span>
        <span className="a3-tpl-blurb">{text.description}</span>
        <span className="a3-tpl-when">
          <TriggerIcon size={11} aria-hidden="true" />{' '}
          {automationTriggerLabel(template.trigger, options, intl)}
        </span>
      </span>
    </button>
  )
}
