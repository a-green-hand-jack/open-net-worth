import { setDisplayFormats } from '../../../utils/format'
import { createIntl } from 'react-intl'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import messages from './zh-CN.messages.json'
import { verificationMessage, required } from './verificationMessages'
import { importHint, importLog, importWarning, importPhase, importOutcome } from './importMessages'

const intl = createIntl({ locale: 'zh-CN', messages })
it('localizes verified audit messages while retaining amounts and names', () => {
  expect(verificationMessage(intl, { message_id: 'ynab.import.check.balance', params: { name: 'Savings' } }, 'original')).toBe('Savings：余额')
  expect(verificationMessage(intl, { message_id: 'ynab.import.note.transactionSum', params: { amount: '1,234.50' } }, 'original')).toContain('1,234.50')
  expect(importHint(intl, { message_id: 'ynab.import.hint.previously_deleted', params: {} }, 'original')).toContain('删除')
})
it('preserves history, external messages and malformed parameters', () => {
  expect(verificationMessage(intl, null, 'old text')).toBe('old text')
  expect(verificationMessage(intl, { message_id: 'unknown', params: {} }, 'external text')).toBe('external text')
  expect(verificationMessage(intl, { message_id: 'ynab.import.check.balance', params: {} }, 'raw')).toBe('raw')
  expect(importHint(intl, { message_id: 'unknown', params: {} }, 'raw')).toBe('raw')
})

it('covers all verification IDs and their parameters from the backend contract', () => {
  const contract = JSON.parse(readFileSync('../backend/core/ynab_import_message_contract.json', 'utf8')) as Record<string, string[]>
  const relevant = Object.fromEntries(Object.entries(contract).filter(([id]) => /^ynab\.import\.(check|note|value)\./.test(id)).map(([id, fields]) => [id.slice('ynab.import.'.length), fields]))
  expect(required).toEqual(relevant)
})

it('registers all backend import hint IDs', () => {
  const contract = JSON.parse(readFileSync('../backend/core/ynab_import_message_contract.json', 'utf8')) as Record<string, string[]>
  const expected = Object.keys(contract).filter(id => id.startsWith('ynab.import.hint.')).sort()
  const source = readFileSync('src/components/tabs/imports/importMessages.ts', 'utf8')
  const actual = [...source.matchAll(/case '(ynab\.import\.hint\.[a-z_]+)'/g)].map(match => match[1]).sort()
  expect(actual).toEqual(expected)
})

it('explains marked one-sided transfers without losing the fallback for malformed data', () => {
  expect(importWarning(intl, { message_id: 'ynab.import.warning.oneSidedTransfer', params: { count: '2' } }, 'raw')).toContain('作为普通收入或支出导入')
  expect(importWarning(intl, { message_id: 'ynab.import.warning.oneSidedTransfer', params: { count: 'bad' } }, 'raw')).toBe('raw')
})

it('respects number_format for structured financial amounts independently of UI language', () => {
  setDisplayFormats({ number_format: 'dot' })
  try {
    const meta = { message_id: 'ynab.import.note.transactionSum', params: { amount: '1,234.50' } }
    expect(verificationMessage(intl, meta, 'raw')).toContain('1.234,50')
    expect(verificationMessage(createIntl({ locale: 'en' }), meta, 'raw')).toContain('1.234,50')
  } finally { setDisplayFormats({ number_format: null }) }
})

it('formats structured history amounts using the profile while preserving external references', () => {
  setDisplayFormats({ number_format: 'dot' })
  try {
    const meta = { message_id: 'ynab.import.note.historyActivity', params: { activity: '1,234.50', here: '0.00', onlyYnab: "['1,234.50 [ref]']", onlyHere: '[]' } }
    const text = verificationMessage(intl, meta, 'raw', { onlyYnab: [{ amount: 1234.5, ref: 'ref-123' }], onlyHere: [] })
    expect(text).toContain('1.234,50 [ref-123]')
    expect(text).toContain('0,00')
    expect(verificationMessage(intl, meta, 'raw')).toContain("['1,234.50 [ref]']")
  } finally { setDisplayFormats({ number_format: null }) }
})

it('registers all backend preview warning IDs', () => {
  const contract = JSON.parse(readFileSync('../backend/core/ynab_import_message_contract.json', 'utf8')) as Record<string, string[]>
  const expected = Object.keys(contract).filter(id => id.startsWith('ynab.import.warning.')).sort()
  const source = readFileSync('src/components/tabs/imports/importMessages.ts', 'utf8')
  const actual = [...source.matchAll(/case '(ynab\.import\.warning\.[A-Za-z]+)'/g)].map(match => match[1]).sort()
  expect(actual).toEqual(expected)
})

it('keeps unknown run status and kind values unchanged', async () => {
  const { runKind, runStatus } = await import('./labels')
  expect(runKind('future' as never, intl)).toBe('future')
  expect(runStatus('waiting' as never, intl)).toBe('waiting')
})

it('uses stable log messages and preserves backup names', () => {
  expect(importLog(intl, { message_id: 'ynab.import.log.backup', params: { backup: 'my-backup.zip' } }, 'raw')).toContain('my-backup.zip')
  expect(importLog(intl, { message_id: 'ynab.import.log.backup', params: {} }, 'raw')).toBe('raw')
  setDisplayFormats({ number_format: 'dot' })
  try { expect(importLog(intl, { message_id: 'ynab.import.log.cleared', params: { count: '1234' } }, 'raw')).toContain('1.234') }
  finally { setDisplayFormats({ number_format: null }) }
})

it('registers all backend import log IDs', () => {
  const contract = JSON.parse(readFileSync('../backend/core/ynab_import_message_contract.json', 'utf8')) as Record<string, string[]>
  const expected = Object.keys(contract).filter(id => id.startsWith('ynab.import.log.')).sort()
  const source = readFileSync('src/components/tabs/imports/importMessages.ts', 'utf8')
  const actual = [...source.matchAll(/case '(ynab\.import\.log\.[A-Za-z]+)'/g)].map(match => match[1]).sort()
  expect(actual).toEqual(expected)
})


it('registers phase and outcome IDs and formats structured counts', () => {
  const contract = JSON.parse(readFileSync('../backend/core/ynab_import_message_contract.json', 'utf8')) as Record<string, string[]>
  const source = readFileSync('src/components/tabs/imports/importMessages.ts', 'utf8')
  for (const kind of ['phase', 'outcome']) {
    const expected = Object.keys(contract).filter(id => id.startsWith(`ynab.import.${kind}.`)).sort()
    const actual = [...source.matchAll(/case '(ynab\.import\.(?:phase|outcome)\.[A-Za-z]+)'/g)].map(match => match[1]!).filter(id => id.includes(`.${kind}.`)).sort()
    expect(actual).toEqual(expected)
  }
  expect(importPhase(intl, { message_id: 'ynab.import.phase.reading', params: {} }, 'raw')).toContain('读取')
  expect(importPhase(intl, { message_id: 'ynab.import.phase.reading', params: { unexpected: 'x' } }, 'raw')).toBe('raw')
  setDisplayFormats({ number_format: 'dot' })
  try {
    expect(importOutcome(intl, { message_id: 'ynab.import.outcome.preview', params: { accounts: '2', transactions: '1234' } }, 'raw')).toContain('1.234')
    expect(importOutcome(intl, { message_id: 'ynab.import.outcome.preview', params: { accounts: '2', transactions: 'x' } }, 'raw')).toBe('raw')
  } finally { setDisplayFormats({ number_format: null }) }
})
