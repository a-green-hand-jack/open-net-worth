import type { IntlShape } from 'react-intl'
import type { StoryArc } from './storyMeta'
import type { WatchFinding, WatchFit } from '../../types/watchPulse'
import { findingText } from './findingText'

export function localizedFit(fit: Pick<WatchFit, 'note' | 'note_message'> | null | undefined, intl: IntlShape): string {
  const message = fit?.note_message
  if (message?.id !== 'watchPulse.fit' || !message.params || !['new', 'largest', 'existing'].includes(message.params.state) || typeof message.params.sector !== 'string' || typeof message.params.percent !== 'string') return fit?.note ?? ''
  return intl.formatMessage({ id: 'watchPulse.fit', defaultMessage: '{state, select, new {New sector for you — no {sector} exposure today} largest {You already hold {percent}% in {sector} — your largest sector} other {You already hold {percent}% in {sector}}}' }, message.params)
}

function usableFindings(value: unknown): value is WatchFinding[] {
  return Array.isArray(value) && value.every(f => f && typeof f === 'object' && typeof f.text === 'string')
}

export function watchStoryHeadline(story: StoryArc, fallback: string, intl: IntlShape): string {
  const p = story.watch_presentation
  if (!story.watch || !p || p.version !== 1 || story.timeline?.[0]?.title?.trim() || p.headline_source !== story.label || typeof p.ticker !== 'string' || !usableFindings(p.headline_findings)) return fallback
  return intl.formatMessage({ id: 'intel.watchStory.headline', defaultMessage: '{ticker}: {findings}' }, { ticker: p.ticker, findings: p.headline_findings.map(f => findingText(f, intl)).join(' · ') })
}

export function watchStorySummary(story: StoryArc, intl: IntlShape): string {
  const p = story.watch_presentation
  if (!story.watch || !p || p.version !== 1 || p.summary_source !== story.summary || typeof p.name !== 'string' || !usableFindings(p.extra_findings)) return story.summary
  const first = intl.formatMessage({ id: 'intel.watchStory.summary', defaultMessage: '{name} is on your watchlist, not held — no position at risk.' }, { name: p.name })
  return p.extra_findings.length ? `${first} ${intl.formatMessage({ id: 'intel.watchStory.also', defaultMessage: 'Also: {findings}.' }, { findings: p.extra_findings.map(f => findingText(f, intl)).join('; ') })}` : first
}

export function watchStoryImpact(story: StoryArc, intl: IntlShape): string {
  const p = story.watch_presentation
  if (!story.watch || !p || p.version !== 1 || p.impact_source !== (story.portfolio_impact ?? '')) return story.portfolio_impact ?? ''
  return localizedFit({ note: story.portfolio_impact ?? '', note_message: p.fit_message }, intl)
}
