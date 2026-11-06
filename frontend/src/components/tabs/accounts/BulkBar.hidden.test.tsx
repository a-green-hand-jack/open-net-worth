// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { BulkBar } from './BulkBar'
import zh from './bulk.zh-CN.json'

afterEach(() => cleanup())

function renderBar(actionable: { hide: number; unhide: number }, chinese = false) {
  const onHide = vi.fn()
  const onUnhide = vi.fn()
  render(
    <IntlProvider locale={chinese ? 'zh-CN' : 'en'} messages={chinese ? zh : {}}>
      <BulkBar
        count={2}
        total={{ amount: -30, currency: null, approx: false }}
        accounts={[]}
        categories={[]}
        railCollapsed={false}
        railWidth={240}
        onClear={vi.fn()}
        onCategory={vi.fn()}
        onAskLucius={vi.fn()}
        onMarkCleared={vi.fn()}
        onMarkUncleared={vi.fn()}
        onMarkReviewed={vi.fn()}
        onHide={onHide}
        onUnhide={onUnhide}
        actionable={{ review: 0, clear: 2, unclear: 0, ...actionable }}
        onDuplicate={vi.fn()}
        onMemo={vi.fn()}
        onMove={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: chinese ? '更多' : /more/i }))
  return { onHide, onUnhide }
}

describe('BulkBar — Hide from Register / Unhide', () => {
  it('hides the selection from the More menu', () => {
    const { onHide } = renderBar({ hide: 2, unhide: 0 })
    fireEvent.click(screen.getByRole('button', { name: /hide from register/i }))
    expect(onHide).toHaveBeenCalledTimes(1)
  })

  it('greys out whichever action would change nothing', () => {
    renderBar({ hide: 0, unhide: 2 })
    expect(screen.getByRole('button', { name: /hide from register/i })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('button', { name: /^unhide$/i })).toHaveProperty('disabled', false)
  })

  it('translates the action and disabled explanation in Chinese', () => {
    const { onUnhide } = renderBar({ hide: 0, unhide: 2 }, true)
    expect(screen.getByRole('button', { name: '从账簿中隐藏' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '从账簿中隐藏' })).toHaveProperty(
      'title',
      '所选交易均已隐藏',
    )
    fireEvent.click(screen.getByRole('button', { name: '取消隐藏' }))
    expect(onUnhide).toHaveBeenCalledTimes(1)
  })
})
