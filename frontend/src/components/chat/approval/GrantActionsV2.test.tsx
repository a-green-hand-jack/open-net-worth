// @vitest-environment jsdom
//
// A permission card's buttons (owner, 2026-10-12): Deny on the left as a real button; the allow
// scopes grouped on the right — with room, [Allow once] [Always allow] as separate buttons; on a
// narrow card one [Allow once ▾] split button.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GrantActionsV2 } from './GrantActionsV2'
import { IntlProvider } from 'react-intl'
import messages from '../zh-CN.messages.json'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function rowWidth(width: number) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private cb: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
      }
      observe() {
        act(() => this.cb([{ contentRect: { width } } as ResizeObserverEntry], this as never))
      }
      disconnect() {}
    },
  )
}

function mount() {
  const handlers = { onOnce: vi.fn(), onAlways: vi.fn(), onDeny: vi.fn() }
  const { container } = render(<GrantActionsV2 busy={null} disabled={false} {...handlers} />)
  const labels = [...container.querySelectorAll('.change-preview-actions button')]
    .filter((b) => !b.closest('[role="menu"]'))
    .map((b) => b.textContent || b.getAttribute('aria-label'))
  return { container, labels, ...handlers }
}

function rowChildren(container: HTMLElement) {
  return [...(container.querySelector('.change-preview-actions')?.children ?? [])]
}

describe('permission card buttons', () => {
  it('shows the scope of a standing permission in Chinese', () => {
    rowWidth(360)
    render(<IntlProvider locale="zh-CN" messages={messages}><GrantActionsV2 busy={null} disabled={false} onOnce={vi.fn()} onAlways={vi.fn()} onDeny={vi.fn()} /></IntlProvider>)
    expect(screen.getByText('允许一次')).toBeTruthy()
    expect(screen.getByText('始终允许').getAttribute('title')).toContain('所有调用和任何金额')
    expect(screen.getByText('拒绝')).toBeTruthy()
  })
  it('on a wide card: Deny first on the left, both allow scopes grouped on the right', () => {
    rowWidth(360)
    const { container, labels, onAlways, onDeny } = mount()
    expect(labels).toEqual(['Deny', 'Allow once', 'Always allow'])
    expect(container.querySelector('.grant-split')).toBeNull()
    const [first, second] = rowChildren(container) as [Element, Element]
    expect(first.className).toContain('change-grant-btn--deny')
    expect(first.className).toContain('change-discard-btn') // a bordered button, not bare text
    expect(second.className).toContain('change-grant-allow')
    const always = screen.getByText('Always allow')
    expect(always.getAttribute('title')).toMatch(/every future call, any amount/)
    fireEvent.click(always)
    expect(onAlways).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Deny'))
    expect(onDeny).toHaveBeenCalledOnce()
  })

  it('on a narrow card: Deny still first, the allow scopes grouped into a split button', () => {
    rowWidth(240)
    const { container, labels, onAlways } = mount()
    expect(labels).toEqual(['Deny', 'Allow once', 'Standing permission'])
    expect(screen.queryByText('Always allow')).toBeNull()
    fireEvent.click(screen.getByLabelText('Standing permission'))
    fireEvent.click(screen.getByText('Always allow'))
    expect(onAlways).toHaveBeenCalledOnce()
    expect(rowChildren(container)[0]!.textContent).toBe('Deny')
  })

  it('stays grouped where the width cannot be measured', () => {
    const { labels } = mount()
    expect(labels).toEqual(['Deny', 'Allow once', 'Standing permission'])
  })
})
