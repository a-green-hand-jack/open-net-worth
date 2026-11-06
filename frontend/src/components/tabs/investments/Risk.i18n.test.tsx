// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { fBase } from '../../../utils/format'
import { Risk } from './Risk'

afterEach(cleanup)
it('keeps the stress value and settings intact in Chinese', () => {
  const save = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <Risk
        risk={[{ nm: 'ACME', pct: 30, val: 1000, hot: true }]}
        grand={1000}
        guideline={20}
        dropPct={30}
        onSaveSettings={save}
      />
    </IntlProvider>,
  )
  expect(screen.getByText(/ACME 下跌 30%/)).toBeTruthy()
  expect(screen.getByText(fBase(300), { exact: false })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '调整' }))
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(save).toHaveBeenCalledWith({ guideline: 20, dropPct: 30 })
})
