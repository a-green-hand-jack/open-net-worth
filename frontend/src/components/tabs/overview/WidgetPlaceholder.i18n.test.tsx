// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it } from 'vitest'
import { catalogs } from '../../../i18n/catalogs'
import { WidgetSkeleton } from './WidgetPlaceholder'

afterEach(cleanup)

it('announces the loading state in the selected interface language', () => {
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <WidgetSkeleton />
    </IntlProvider>,
  )
  expect(screen.getByLabelText('正在加载').getAttribute('aria-busy')).toBe('true')
})
