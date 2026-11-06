// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../i18n/catalogs'
import { GridCard } from './GridCard'

afterEach(cleanup)

it('translates card actions while preserving callbacks and resize direction', () => {
  const onEdit = vi.fn()
  const onRemove = vi.fn()
  const onMoveUp = vi.fn()
  const onResizePointerDown = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <GridCard
        x={0}
        y={0}
        w={12}
        h={200}
        editing
        onOpenFullscreen={vi.fn()}
        onEdit={onEdit}
        onRemove={onRemove}
        onMoveUp={onMoveUp}
        onResizePointerDown={onResizePointerDown}
      >
        Custom content
      </GridCard>
    </IntlProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: '编辑小组件' }))
  fireEvent.click(screen.getByRole('button', { name: '移除小组件' }))
  fireEvent.click(screen.getByRole('button', { name: '上移' }))
  fireEvent.pointerDown(screen.getAllByRole('button', { name: '调整宽度' })[0]!)
  expect(onEdit).toHaveBeenCalledOnce()
  expect(onRemove).toHaveBeenCalledOnce()
  expect(onMoveUp).toHaveBeenCalledOnce()
  expect(onResizePointerDown).toHaveBeenCalledWith(expect.anything(), 1, 0)
  expect(screen.getByText('Custom content')).toBeTruthy()
})
