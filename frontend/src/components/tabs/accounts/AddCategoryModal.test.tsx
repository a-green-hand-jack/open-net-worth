// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { AddCategoryModal } from './AddCategoryModal'

afterEach(() => cleanup())

describe('AddCategoryModal', () => {
  it('creates an income category without category-level tax controls or data', () => {
    const onSave = vi.fn()
    render(<AddCategoryModal open kind="income" onClose={vi.fn()} onSave={onSave} />)

    expect(screen.queryByText('Taxable')).toBeNull()
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Salary' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({ name: 'Salary', kind: 'income' })
  })
  it('explains the selected type in Chinese and saves the original name and kind', () => {
    const onSave = vi.fn()
    render(
      <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
        <AddCategoryModal open kind="income" onClose={vi.fn()} onSave={onSave} />
      </IntlProvider>,
    )
    expect(screen.getByText('资金流入（+）')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '转账' }))
    expect(screen.getByText('账户之间的资金转移。', { exact: false })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('分类名称'), { target: { value: 'My category' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledWith({ name: 'My category', kind: 'transfer' })
  })
})
