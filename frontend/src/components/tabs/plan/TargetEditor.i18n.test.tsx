// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { TargetEditor } from './budgetTarget'
import type { LocalCat } from './useBudgetModel'
import messages from './zh-CN.messages.json'

afterEach(cleanup)

describe('localized target editor', () => {
  it('keeps weekday and cadence identifiers when saving Chinese selections', () => {
    const save = vi.fn()
    const cat: LocalCat = {
      key: 'synthetic',
      envelopeId: 'synthetic',
      label: 'Example',
      color: '#123456',
      assigned: 0,
      activity: 0,
      available: 0,
      target: 0,
      status: 'none',
      needed: 0,
      tt: 'set_aside',
      cad: 'monthly',
      categoryIds: [],
    }
    render(
      <IntlProvider locale="zh-CN" messages={messages} onError={() => {}}>
        <TargetEditor
          cat={cat}
          initialMode="edit"
          note=""
          onSaveNote={() => {}}
          onCancel={() => {}}
          onRemove={() => {}}
          onFund={() => {}}
          onMoney={() => {}}
          onSave={save}
        />
      </IntlProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '每周' }))
    const weekday = screen.getByRole('combobox') as HTMLSelectElement
    expect(weekday.selectedOptions[0]?.textContent).toBe('星期一')
    fireEvent.change(weekday, { target: { value: 'Tuesday' } })
    const amount = screen.getByRole('spinbutton') as HTMLInputElement
    fireEvent.change(amount, { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: '保存目标' }))
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ cad: 'weekly', dueWeekday: 1, tamt: 100 }),
    )
  })
})
