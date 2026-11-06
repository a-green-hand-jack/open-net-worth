// @vitest-environment jsdom
//
// Focusing the empty register search box offers Uncategorized / Uncleared / Needs review
// as one-click filters — without a stray Enter adding one, and without re-offering a
// filter that is already on.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { SearchFilter, type FilterToken } from './SearchFilter'

const suggest = { categories: [], payees: [], accounts: [], tags: [] }

function setup(tokens: FilterToken[] = [], chinese = false) {
  const addToken = vi.fn()
  render(
    <SearchFilter
      tokens={tokens}
      addToken={addToken}
      removeToken={() => {}}
      clearTokens={() => {}}
      suggest={suggest}
      sym="$"
    />,
    chinese
      ? {
          wrapper: ({ children }) => (
            <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
              {children}
            </IntlProvider>
          ),
        }
      : undefined,
  )
  const input = screen.getByRole('textbox')
  fireEvent.focus(input)
  return { addToken, input }
}

const options = () => screen.queryAllByRole('button').map((b) => b.textContent)

afterEach(cleanup)

describe('SearchFilter — quick picks', () => {
  it('displays Chinese quick filters while keeping canonical filter values', () => {
    const { addToken } = setup([], true)
    expect(options()).toEqual(['分类未分类', '状态未入账', '状态需要审核'])
    fireEvent.mouseDown(screen.getByText('未入账'))
    expect(addToken).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'cleared', value: false, label: 'Uncleared' }),
    )
  })
  it('accepts a Chinese status query and emits its canonical hidden filter', () => {
    const { addToken, input } = setup([], true)
    fireEvent.change(input, { target: { value: '状态：已隐藏' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(addToken).toHaveBeenCalledWith(expect.objectContaining({ field: 'hidden', value: true }))
  })
  it('accepts a Chinese date query without changing its canonical ISO value', () => {
    const { addToken, input } = setup([], true)
    fireEvent.change(input, { target: { value: '日期：2026年6月1日' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(addToken).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'date_on', value: '2026-06-01' }),
    )
  })
  it('keeps a bare Chinese search as user text rather than translating the query', () => {
    const { addToken, input } = setup([], true)
    fireEvent.change(input, { target: { value: '收入' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(addToken).toHaveBeenCalledWith(expect.objectContaining({ field: 'text', value: '收入' }))
  })
  it('lists Uncategorized, Uncleared and Needs review on focus, and one click adds it', () => {
    const { addToken } = setup()
    expect(options()).toEqual(['CategoryUncategorized', 'StatusUncleared', 'StatusNeeds review'])
    fireEvent.mouseDown(screen.getByText('Uncategorized'))
    expect(addToken).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'uncategorized', value: true, label: 'Uncategorized' }),
    )
  })

  it('Enter on the empty box adds nothing until the user arrows to a pick', () => {
    const { addToken, input } = setup()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(addToken).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(addToken).toHaveBeenCalledWith(expect.objectContaining({ field: 'uncategorized' }))
  })

  it('does not re-offer a filter that is already on', () => {
    setup([{ field: 'cleared', value: false, label: 'Uncleared' }])
    expect(screen.queryByText('Uncleared', { selector: '.acct-sug-txt' })).toBeNull()
    expect(screen.getByText('Uncategorized')).toBeTruthy()
  })
})
