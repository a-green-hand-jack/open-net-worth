// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { setDisplayFormats } from '../../../utils/format'

vi.mock('../../../api/portfolio', () => ({
  fetchIncome: async () => null,
  fetchIncomeForecast: async () => null,
  fetchIncomeCalendar: async () => ({
    payments: [],
    total_base: 1234.5,
    count: 0,
    horizon_days: 90,
  }),
}))
import { useIncomeView } from './useIncomeView'

afterEach(() => setDisplayFormats({}))

it('reformats cached income on profile load and subsequent preference changes', async () => {
  setDisplayFormats({ number_format: 'comma' })
  const { result } = renderHook(() => useIncomeView())
  await waitFor(() => expect(result.current.calendarTotalFmt).toContain('1,234.50'))
  act(() => setDisplayFormats({ number_format: 'dot' }))
  expect(result.current.calendarTotalFmt).toContain('1.234,50')
  act(() => setDisplayFormats({ number_format: 'comma' }))
  expect(result.current.calendarTotalFmt).toContain('1,234.50')
})
