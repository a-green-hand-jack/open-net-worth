// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../i18n/catalogs'
import { SplitEditor } from './SplitEditor'

afterEach(cleanup)

it('translates split editing and keeps the remaining amount masked and correct', () => {
  const onChange = vi.fn()
  const lines = [{ category: 'cat_a', amount: '40', note: 'Synthetic note' }]
  const { container } = render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <SplitEditor
        lines={lines}
        onChange={onChange}
        total={100}
        currency="USD"
        options={[]}
        onCreateCategory={() => {}}
        onUnsplit={() => {}}
      />
    </IntlProvider>,
  )
  expect(screen.getByText('拆分 • 1 个分类')).toBeTruthy()
  expect(screen.getByLabelText('拆分金额')).toHaveProperty('value', '40')
  expect(screen.getByLabelText('拆分备注')).toHaveProperty('value', 'Synthetic note')
  expect(container.querySelector('.acct-edit-splitremain .money')?.textContent).toContain('60.00')
  fireEvent.click(screen.getByRole('button', { name: /添加一行/ }))
  expect(onChange).toHaveBeenCalledWith([...lines, { category: '', amount: '60', note: '' }])
})
