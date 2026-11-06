// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { ColumnsPicker } from './columns'

afterEach(() => cleanup())

function open(props: { hidden?: Set<string>; showHidden?: boolean; chinese?: boolean }) {
  const onReset = vi.fn()
  const onToggleShowHidden = vi.fn()
  render(
    <IntlProvider
      locale={props.chinese ? 'zh-CN' : 'en'}
      messages={props.chinese ? catalogs['zh-CN'] : {}}
    >
      <ColumnsPicker
        showAccount={false}
        hidden={props.hidden ?? new Set()}
        onToggle={vi.fn()}
        onReset={onReset}
        showHidden={props.showHidden ?? false}
        onToggleShowHidden={onToggleShowHidden}
      />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByTitle(props.chinese ? '显示选项' : 'Display options'))
  return { onReset, onToggleShowHidden }
}

describe('Display picker', () => {
  it('is labelled Display and offers the hidden-rows switch', () => {
    open({})
    expect(screen.getByText('Display')).toBeTruthy()
    expect(screen.getByText('Show hidden transactions')).toBeTruthy()
  })

  it('Reset is disabled while everything is at its default', () => {
    open({})
    expect(screen.getByText('Reset')).toHaveProperty('disabled', true)
  })

  it('Reset restores the columns AND turns Show hidden off', () => {
    const { onReset, onToggleShowHidden } = open({ showHidden: true })
    fireEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onToggleShowHidden).toHaveBeenCalledTimes(1)
  })

  it('translates display options while retaining reset behavior', () => {
    const { onReset, onToggleShowHidden } = open({ showHidden: true, chinese: true })
    expect(screen.getByText('显示隐藏的交易')).toBeTruthy()
    expect(screen.getByText('收款方')).toBeTruthy()
    fireEvent.click(screen.getByText('重置'))
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onToggleShowHidden).toHaveBeenCalledTimes(1)
  })
})
