import { createIntl } from 'react-intl'
import { expect, it } from 'vitest'
import messages from '../components/intel/zh-CN.messages.json'
import { refreshNoticeText } from './useAssetDetail'

it('localizes known refresh reasons and preserves unknown source text', () => {
  const intl = createIntl({ locale: 'zh-CN', messages })
  expect(refreshNoticeText('rate_limited', intl)).toBe('刚刚刷新过，请稍后再试')
  expect(refreshNoticeText('fresh', intl)).toBe('已经是最新')
  expect(refreshNoticeText('search_unconfigured', intl)).toBe('尚未配置搜索')
  expect(refreshNoticeText('no_ticker', intl)).toBe('没有可供研究的股票代码')
  expect(refreshNoticeText('refresh_failed', intl)).toBe('刷新失败，请重试')
  expect(refreshNoticeText('external provider text', intl)).toBe('external provider text')
})
