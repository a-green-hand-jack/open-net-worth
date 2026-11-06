import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import messages from './zh-CN.messages.json'
import type { StoryArc } from './storyMeta'
import { watchStoryHeadline, watchStoryImpact, watchStorySummary } from './watchStoryPresentation'

const intl = createIntl({ locale: 'zh-CN', messages })
const story = {
  id: 'story', type: 'asset', status: 'active', action_items: [], created_at: '', updated_at: '', watch: true, label: 'ACME: Up 8.0% today', summary: 'Test Co is on your watchlist, not held — no position at risk.', portfolio_impact: 'You already hold 35% in Technology — your largest sector', timeline: [],
  watch_presentation: {
    version: 1, ticker: 'ACME', name: 'Test Co', headline_source: 'ACME: Up 8.0% today', summary_source: 'Test Co is on your watchlist, not held — no position at risk.', impact_source: 'You already hold 35% in Technology — your largest sector',
    headline_findings: [{ kind: 'big_move', tone: 'good', weight: 1, severity: 'medium', text: 'Up 8.0% today', text_message: { id: 'watchPulse.move', params: { direction: 'up', percent: '8.0' } } }], extra_findings: [],
    fit_message: { id: 'watchPulse.fit', params: { state: 'largest', sector: 'Technology', percent: '35' } },
  },
} as StoryArc

describe('persisted watch story presentation', () => {
  it('localizes verified generated fields and retains values', () => {
    expect(watchStoryHeadline(story, story.label, intl)).toContain('上涨 8.0%')
    expect(watchStorySummary(story, intl)).toContain('Test Co')
    expect(watchStoryImpact(story, intl)).toContain('35%')
  })
  it('keeps historical and model-replaced text unchanged', () => {
    const changed = { ...story, label: 'Model headline', summary: 'Model summary', portfolio_impact: 'Model impact' }
    expect(watchStoryHeadline(changed, changed.label, intl)).toBe('Model headline')
    expect(watchStorySummary(changed, intl)).toBe('Model summary')
    expect(watchStoryImpact(changed, intl)).toBe('Model impact')
    expect(watchStoryHeadline({ ...story, watch_presentation: null }, story.label, intl)).toBe(story.label)
    expect(watchStoryHeadline({ ...story, timeline: [{ id: 't', date: '', title: 'New model title', summary: '', sources: [] }] }, 'New model title', intl)).toBe('New model title')
  })
})
