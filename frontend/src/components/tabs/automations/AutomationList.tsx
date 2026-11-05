import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { templateField } from './templateMessages'
import { ArrowUpDown, ChevronDown, Plus, Search, Sparkles, Wrench } from 'lucide-react'
import type { Automation, AutomationDraft } from '../../../api/automations'
import { AutomationCard } from './AutomationCard'
import { AutomationFinishedSection } from './AutomationFinishedSection'
import { AutomationMenu } from './AutomationMenu'
import { automationTriggerLabel, type AutomationOptions } from './AutomationTriggerSummary'
import { KeepAwakeBanner } from './KeepAwakeBanner'
import { TemplateGallery } from './TemplateGallery'
import { Cluster, EmptyState } from '../../ui'
import { Workflow } from '../../../ui/icons'
import { LuciusCta } from '../../intro/LuciusCta'

export type AutomationSort = 'next' | 'recent' | 'cost' | 'name'

const SORT_LABELS: Record<AutomationSort, string> = {
  next: 'Next run',
  recent: 'Recently run',
  cost: 'Cost this month',
  name: 'Name',
}

function parkedRank(automation: Automation): number {
  if (automation.status === 'completed') return 2
  return automation.status === 'paused' ? 1 : 0
}

export function filterAndSortAutomations(
  automations: Automation[],
  query: string,
  sort: AutomationSort,
  options?: AutomationOptions,
  intl?: IntlShape,
) {
  const needle = query.trim().toLocaleLowerCase()
  const filtered = automations.filter((automation) => {
    const searchable = [
      automation.name,
      automation.description,
      automation.instructions,
      automationTriggerLabel(automation.trigger, options, intl),
      intl ? templateField(intl, 'name', automation.name, automation.template_source?.name) : '',
      intl
        ? templateField(
            intl,
            'description',
            automation.description,
            automation.template_source?.description,
          )
        : '',
    ]
      .join(' ')
      .toLocaleLowerCase()
    return !needle || searchable.includes(needle)
  })
  return filtered.sort((left, right) => {
    // Paused always sinks, whatever the sort. A paused Automation keeps the next_run_at it
    // had when it was paused, so under "Next run" a long-paused one has the oldest date and
    // led the whole list — the things that will NOT run were the first thing you saw.
    const parked = parkedRank(left) - parkedRank(right)
    if (parked !== 0) return parked
    if (sort === 'recent') return timestamp(right.last_run_at) - timestamp(left.last_run_at)
    if (sort === 'cost') return stat(right, 'cost_this_month') - stat(left, 'cost_this_month')
    if (sort === 'name') {
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true })
    }
    return (
      timestamp(left.next_run_at, Number.POSITIVE_INFINITY) -
      timestamp(right.next_run_at, Number.POSITIVE_INFINITY)
    )
  })
}

export function AutomationList({
  automations,
  options,
  query,
  onQueryChange,
  sort,
  onSortChange,
  busyId,
  onOpen,
  onRunNow,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onNew,
  onAskLucius,
  onTemplate,
  onClearFinished,
}: {
  automations: Automation[]
  options?: AutomationOptions
  query: string
  onQueryChange: (query: string) => void
  sort: AutomationSort
  onSortChange: (sort: AutomationSort) => void
  busyId?: string | null
  onOpen: (automation: Automation) => void
  onRunNow: (automation: Automation) => void
  onToggle: (automation: Automation) => void
  onEdit: (automation: Automation) => void
  onDuplicate: (automation: Automation) => void
  onDelete: (automation: Automation) => void
  onNew: () => void
  onAskLucius: (text: string) => void
  onTemplate: (template: AutomationDraft) => void
  onClearFinished: () => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const sortLabels: Record<AutomationSort, string> = {
    next: formatMessage({ id: 'automations.sortNext', defaultMessage: 'Next run' }),
    recent: formatMessage({ id: 'automations.sortRecent', defaultMessage: 'Recently run' }),
    cost: formatMessage({ id: 'automations.sortCost', defaultMessage: 'Cost this month' }),
    name: formatMessage({ id: 'automations.sortName', defaultMessage: 'Name' }),
  }
  const visible = filterAndSortAutomations(automations, query, sort, options, intl)
  const live = visible.filter((automation) => automation.status !== 'completed')
  const finished = visible
    .filter((automation) => automation.status === 'completed')
    .sort((left, right) => timestamp(right.last_run_at) - timestamp(left.last_run_at))
  return (
    <div className="a3-wrap" data-od-id="automations-list">
      <div className="a3-toolbar" data-od-id="list-toolbar">
        <label className="a3-search">
          <Search size={15} strokeWidth={1.6} aria-hidden="true" />
          <span className="ui-visually-hidden">
            {formatMessage({ id: 'automations.search', defaultMessage: 'Search automations' })}
          </span>
          <input
            type="search"
            value={query}
            placeholder={formatMessage({
              id: 'automations.searchPlaceholder',
              defaultMessage: 'Search automations…',
            })}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <span className="grow" />
        <AutomationMenu
          triggerClassName="a3-sort"
          label={formatMessage({ id: 'automations.sort', defaultMessage: 'Sort automations' })}
          trigger={
            <>
              <ArrowUpDown
                className="a3-toolbar-ic"
                size={15}
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <span className="a3-toolbar-label">
                {formatMessage({ id: 'automations.sortBy', defaultMessage: 'Sort by' })}{' '}
                <b>{sortLabels[sort]}</b>
              </span>
              <ChevronDown
                className="a3-toolbar-chevron"
                size={12}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </>
          }
          items={(Object.keys(SORT_LABELS) as AutomationSort[]).map((key) => ({
            label: sortLabels[key],
            checked: sort === key,
            onSelect: () => onSortChange(key),
          }))}
        />
        <AutomationMenu
          triggerClassName="a3-new-button"
          popoverClassName="a3-new-pop"
          label={formatMessage({ id: 'automations.new', defaultMessage: 'New automation' })}
          trigger={
            <>
              <Plus className="a3-toolbar-ic" size={14} aria-hidden="true" />
              <span className="a3-toolbar-label">
                {formatMessage({ id: 'automations.new', defaultMessage: 'New automation' })}
              </span>
              <ChevronDown
                className="a3-toolbar-chevron"
                size={12}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </>
          }
          items={[
            {
              label: formatMessage({
                id: 'automations.createLucius',
                defaultMessage: 'Create with Lucius',
              }),
              icon: (
                <span className="a3-menu-ic lucius">
                  <Sparkles size={13} aria-hidden="true" />
                </span>
              ),
              onSelect: () =>
                onAskLucius(
                  formatMessage({
                    id: 'automations.newPrompt',
                    defaultMessage:
                      'Draft a new automation for me. Ask what it should do and when it should run, then show me the completed draft before creating it.',
                  }),
                ),
            },
            {
              label: formatMessage({ id: 'automations.manual', defaultMessage: 'Set up manually' }),
              icon: (
                <span className="a3-menu-ic">
                  <Wrench size={14} aria-hidden="true" />
                </span>
              ),
              onSelect: onNew,
            },
          ]}
        />
      </div>

      <KeepAwakeBanner />

      {visible.length === 0 &&
        (automations.length === 0 ? (
          <EmptyState
            icon={<Workflow size={28} strokeWidth={1.5} aria-hidden="true" />}
            title={formatMessage({ id: 'automations.empty', defaultMessage: 'No automations yet' })}
            body={formatMessage({
              id: 'automations.emptyHelp',
              defaultMessage: 'Start from a template below.',
            })}
            action={
              <Cluster gap="--space-3" justify="center">
                <LuciusCta
                  label={formatMessage({
                    id: 'automations.setupLucius',
                    defaultMessage: 'Set up with Lucius',
                  })}
                  message={formatMessage({
                    id: 'automations.firstPrompt',
                    defaultMessage:
                      'Help me set up a useful automation, like logging transactions from my bank emails or a daily briefing. Ask me one thing at a time.',
                  })}
                  onAskLucius={onAskLucius}
                />
              </Cluster>
            }
          />
        ) : (
          <div className="a3-empty">
            <span>
              {formatMessage(
                { id: 'automations.noMatches', defaultMessage: 'Nothing matches “{query}”' },
                { query },
              )}
            </span>
            .{' '}
            <button type="button" className="a3-linkbtn" onClick={() => onQueryChange('')}>
              {formatMessage({ id: 'automations.clearSearch', defaultMessage: 'Clear the search' })}
            </button>
            {formatMessage({
              id: 'automations.orTemplate',
              defaultMessage: ', or start from a template below.',
            })}
          </div>
        ))}
      {live.length > 0 && (
        <div className="a3-list">
          {live.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              options={options}
              busy={busyId === automation.id}
              onOpen={() => onOpen(automation)}
              onRunNow={() => onRunNow(automation)}
              onToggle={() => onToggle(automation)}
              onEdit={() => onEdit(automation)}
              onDuplicate={() => onDuplicate(automation)}
              onDelete={() => onDelete(automation)}
            />
          ))}
        </div>
      )}
      <AutomationFinishedSection
        automations={finished}
        options={options}
        searching={query.trim() !== ''}
        busyId={busyId}
        onOpen={onOpen}
        onRunNow={onRunNow}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onClear={onClearFinished}
      />

      <TemplateGallery options={options} onTemplate={onTemplate} />
    </div>
  )
}

function timestamp(value: string | null, fallback = 0) {
  if (!value) return fallback
  const result = Date.parse(value)
  return Number.isFinite(result) ? result : fallback
}

function stat(automation: Automation, key: string) {
  const value = automation.stats[key]
  return typeof value === 'number' ? value : 0
}
