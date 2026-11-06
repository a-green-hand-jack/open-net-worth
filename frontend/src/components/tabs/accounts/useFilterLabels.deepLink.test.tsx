// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it } from 'vitest'
import zh from '../../../i18n/zh-CN.json'
import accountsZh from './zh-CN.messages.json'
import { useFilterLabels } from './useFilterLabels'
import { setDisplayFormats } from '../../../utils/format'

it('keeps the exact deep-linked payee or category name in a translated filter', () => {
  const { result } = renderHook(() => useFilterLabels(), {
    wrapper: ({ children }) => (
      <IntlProvider locale="zh-CN" messages={{ ...zh, ...accountsZh }}>
        {children}
      </IntlProvider>
    ),
  })
  const payee = result.current({
    field: 'payee',
    value: 'A: B',
    label: 'Payee: A: B',
    displayValue: 'A: B',
  })
  expect(payee.label).toContain('A: B')
  expect(payee.label).not.toContain('Payee:')
  const category = result.current({
    field: 'category',
    value: 'cat_1',
    label: 'Category: Home: Other',
    displayValue: 'Home: Other',
  })
  expect(category.label).toContain('Home: Other')
})

it('keeps the profile date order for a Chinese filter label', () => {
  setDisplayFormats({ date_format: 'mdy' })
  try {
    const { result } = renderHook(() => useFilterLabels(), {
      wrapper: ({ children }) => (
        <IntlProvider locale="zh-CN" messages={{ ...zh, ...accountsZh }}>
          {children}
        </IntlProvider>
      ),
    })
    expect(
      result.current({ field: 'date_on', value: '2026-03-08', label: 'On Mar 8, 2026' }).label,
    ).toContain('Mar 8, 2026')
  } finally {
    setDisplayFormats({})
  }
})
