import { getNumberLocale } from '../../../utils/format'
import type { IntlShape } from 'react-intl'
import type { RunKind, RunStatus } from './runs'

export function runKind(kind: RunKind, intl: IntlShape): string {
  if (!['import', 'verify', 'preview', 'sync'].includes(kind)) return kind
  return intl.formatMessage({ id: 'imports.run.kind', defaultMessage: '{kind, select, import {Import} verify {Verify} preview {Preview} other {Sync}}' }, { kind })
}
export function runStatus(status: RunStatus, intl: IntlShape): string {
  if (!['running', 'done', 'failed', 'interrupted'].includes(status)) return status
  return intl.formatMessage({ id: 'imports.run.status', defaultMessage: '{status, select, running {Running} done {Done} failed {Failed} other {Interrupted}}' }, { status })
}

export const formatImportCount = (value: number) => new Intl.NumberFormat(getNumberLocale(), { maximumFractionDigits: 0 }).format(value)

/** Reformat a server-marked canonical numeric parameter; leave unrecognized text untouched. */
export function formatImportNumberParam(value: string | number): string {
  const text = String(value)
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return text
  const numeric = Number(text.replaceAll(',', ''))
  if (!Number.isFinite(numeric) || Math.abs(numeric) > Number.MAX_SAFE_INTEGER) return text
  const digits = text.split('.')[1]?.length ?? 0
  if (digits > 20) return text
  const formatted = new Intl.NumberFormat(getNumberLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(numeric)
  return text.startsWith('+') && numeric >= 0 ? `+${formatted}` : formatted
}
