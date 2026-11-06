// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { WidgetInstance } from '../types'

vi.mock('../useWidgetData', () => ({
  useAnalytics: () => ({ analytics: { drift: {
    total: 1000, has_targets: true, threshold_pp: 5, top_trade: null,
    rows: [{ key: 'equity', current_pct: 60, target_pct: 40, drift_pp: 20 }],
  } } }),
  useValuedRows: () => ({ rows: [], loading: false }),
}))

import { investingWidgetComponents } from './investing'
import { WIDGET_DEFINITIONS } from '../definitions'

afterEach(() => {
  cleanup()
  document.body.classList.remove('hide-amounts')
})

it('updates allocation tooltip and masks values when privacy is toggled', async () => {
  const Component = investingWidgetComponents['inv-drift']!
  const def = WIDGET_DEFINITIONS.find((item) => item.defId === 'inv-drift')!
  const instance: WidgetInstance = { instanceId: 'synthetic-drift', defId: 'inv-drift', x: 0, y: 0, w: 4, h: 112, config: {} }
  const { container } = render(<Component instance={instance} def={def} onPatch={vi.fn()} />)
  const track = container.querySelector('.ov-drift-track')!
  expect(track.getAttribute('title')).toContain('60.0%')
  expect(screen.getByText('60.0').classList.contains('money')).toBe(true)
  expect(screen.getByText('40.0').classList.contains('money')).toBe(true)
  document.body.classList.add('hide-amounts')
  await waitFor(() => expect(track.getAttribute('title')).not.toContain('60.0'))
  expect(track.getAttribute('title')).not.toContain('40.0')
  document.body.classList.remove('hide-amounts')
  await waitFor(() => expect(track.getAttribute('title')).toContain('60.0%'))
})
