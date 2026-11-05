import { createIntl } from 'react-intl'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import messages from './zh-CN.messages.json'
import { equityError } from './equityErrors'

it('covers the equity error contract and preserves unknown or malformed messages', () => {
  const contract = JSON.parse(readFileSync('../backend/core/equity_message_contract.json', 'utf8')) as Record<string, string[]>
  const source = readFileSync('src/components/tabs/equity/equityErrors.ts', 'utf8')
  const ids = [...source.matchAll(/case '(equity\.error\.[A-Za-z]+)'/g)].map(match => match[1]).sort()
  expect([...ids, 'equity.error.undoLotFailed', 'equity.error.grantInactive', 'equity.error.createLockedPosition', 'equity.error.createPosition', 'equity.error.createVestLot'].sort()).toEqual(Object.keys(contract).sort())
  const intl = createIntl({ locale: 'zh-CN', messages })
  expect(equityError(intl, { message_id: 'equity.error.unitsExceed', message_params: {} }, 'raw')).toContain('不能超过')
  expect(equityError(intl, { message_id: 'equity.error.unitsExceed', message_params: { extra: 'external' } }, 'raw')).toBe('raw')
  expect(equityError(intl, { message_id: 'other', message_params: {} }, 'external')).toBe('external')
})


it('translates known lot causes and preserves unknown external causes', () => {
  const intl = createIntl({ locale: 'zh-CN', messages: { ...messages, 'shared.lotError.soldCannotDelete': '批次股份已出售。' } })
  const message = (reason_id: string) => ({ message_id: 'equity.error.undoLotFailed', message_params: { reason: 'external cause', reason_id } })
  expect(equityError(intl, message('lots.error.soldCannotDelete'), 'raw')).toContain('批次股份已出售。')
  expect(equityError(intl, message('unknown'), 'raw')).toContain('external cause')
})
