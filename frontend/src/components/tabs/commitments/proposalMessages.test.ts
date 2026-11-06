import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import zh from '../../../i18n/zh-CN.json'
import type { Proposal } from './coverageEngine'
import { proposalText } from './proposalMessages'

const proposal = {
  kind: 'move',
  title: 'Bring "Custom label" forward',
  ribbonHint: 'original hint',
  display: { kind: 'move', label: 'Custom label', date: '2026-12-01', weeks: 2, isSale: false },
} as Proposal

describe('generated proposal messages', () => {
  it('translates the known template while retaining the user label', () => {
    const result = proposalText(createIntl({ locale: 'zh-CN', messages: zh }), proposal)
    expect(result.title).toContain('Custom label')
    expect(result.title).toContain('提前')
    expect(result.ribbonHint).toContain('Custom label')
    expect(result.ribbonHint).toContain('不新增借款')
  })
  it('preserves old and English proposals verbatim', () => {
    expect(proposalText(createIntl({ locale: 'en' }), proposal).title).toBe(proposal.title)
    expect(proposalText(createIntl({ locale: 'zh-CN', messages: zh }), { ...proposal, display: undefined }).ribbonHint).toBe('original hint')
  })
})
