import { getNumberLocale } from '../../utils/format'
import type { IntlShape } from 'react-intl'
import { VaultRequestError } from '../../api/vault'

export const vaultErrorParams: Record<string, readonly string[]> = {
  "vault.error.tagsList": [],
  "vault.error.tagLength": [
    "limit"
  ],
  "vault.error.tagsCount": [
    "limit"
  ],
  "vault.error.invalidId": [
    "id"
  ],
  "vault.error.invalidKind": [],
  "vault.error.documentMissing": [
    "id"
  ],
  "vault.error.noteLength": [
    "limit"
  ],
  "vault.error.yearInteger": [],
  "vault.error.yearRange": [
    "min",
    "max"
  ],
  "vault.error.privateBoolean": [],
  "vault.error.uploadMissing": [
    "id"
  ],
  "vault.error.privateUserOnly": [],
  "vault.error.assetPrivateOnly": [],
  "vault.error.editOwnOnly": [],
  "vault.error.unknownFields": [
    "fields",
    "editable"
  ],
  "vault.error.emptyName": [],
  "vault.error.artifactMissing": [
    "id"
  ],
  "vault.error.deleteOwnOnly": [],
  "vault.error.orphanRemoval": [
    "title"
  ],
  "vault.error.soleHomeRemoval": [
    "title",
    "kind"
  ],
  "vault.error.directRemoval": [
    "title"
  ],
  "vault.error.fileTooLarge": [],
  "vault.error.privateNull": [],
  "vault.error.pdfOnly": [],
  "vault.error.fileMissing": [],
  "vault.error.pdfUnreadable": [],
  "vault.error.pdfProtected": [],
  "vault.error.photoOnly": [],
  "vault.error.photoUnreadable": [],
  "vault.error.pageMissing": [
    "page",
    "count"
  ],
  "vault.error.sheetProtected": [],
  "vault.error.tableOnly": [],
  "vault.error.sheetUnreadable": [],
  "vault.error.offsetRange": [
    "max"
  ]
}

export function vaultError(error: unknown, intl: IntlShape): string {
  const fallback = error instanceof Error ? error.message : String(error)
  if (!(error instanceof VaultRequestError) || typeof error.messageId !== 'string' || !Object.hasOwn(vaultErrorParams, error.messageId)) return fallback
  const expected = vaultErrorParams[error.messageId]!
  const raw = error.messageParams
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
  const params = raw as Record<string, unknown>
  if (Object.keys(params).length !== expected.length || expected.some(key => typeof params[key] !== 'string')) return fallback
  const numericKeys = ['limit', 'min', 'max', 'page', 'count']
  if (intl.locale.startsWith('en') && !expected.some(key => numericKeys.includes(key))) return fallback
  const p = { ...params } as Record<string, string>
  for (const key of expected.filter(key => numericKeys.includes(key))) {
    if (!/^\d+$/.test(p[key]!) || !Number.isSafeInteger(Number(p[key]))) return fallback
    p[key] = Number(p[key]).toLocaleString(getNumberLocale())
  }
  switch (error.messageId) {
    case 'vault.error.tagsList': return intl.formatMessage({ id: 'vault.error.tagsList', defaultMessage: "Tags must be a list" })
    case 'vault.error.tagLength': return intl.formatMessage({ id: 'vault.error.tagLength', defaultMessage: "A tag can be up to {limit} characters." }, { limit: p.limit! })
    case 'vault.error.tagsCount': return intl.formatMessage({ id: 'vault.error.tagsCount', defaultMessage: "An item can have up to {limit} tags." }, { limit: p.limit! })
    case 'vault.error.invalidId': return intl.formatMessage({ id: 'vault.error.invalidId', defaultMessage: "Not a document ID: {id}" }, { id: p.id! })
    case 'vault.error.invalidKind': return intl.formatMessage({ id: 'vault.error.invalidKind', defaultMessage: "Kind must be file, artifact, statement, receipt or asset" })
    case 'vault.error.documentMissing': return intl.formatMessage({ id: 'vault.error.documentMissing', defaultMessage: "No document {id}" }, { id: p.id! })
    case 'vault.error.noteLength': return intl.formatMessage({ id: 'vault.error.noteLength', defaultMessage: "A note can be up to {limit} characters." }, { limit: p.limit! })
    case 'vault.error.yearInteger': return intl.formatMessage({ id: 'vault.error.yearInteger', defaultMessage: "Year must be a whole number, e.g. 2025" })
    case 'vault.error.yearRange': return intl.formatMessage({ id: 'vault.error.yearRange', defaultMessage: "Year must be between {min} and {max}" }, { min: p.min!, max: p.max! })
    case 'vault.error.privateBoolean': return intl.formatMessage({ id: 'vault.error.privateBoolean', defaultMessage: "Private must be true or false" })
    case 'vault.error.uploadMissing': return intl.formatMessage({ id: 'vault.error.uploadMissing', defaultMessage: "No stored upload {id}" }, { id: p.id! })
    case 'vault.error.privateUserOnly': return intl.formatMessage({ id: 'vault.error.privateUserOnly', defaultMessage: "Only the user can switch Private off, in Documents." })
    case 'vault.error.assetPrivateOnly': return intl.formatMessage({ id: 'vault.error.assetPrivateOnly', defaultMessage: "Private is the only setting available here for an asset file" })
    case 'vault.error.editOwnOnly': return intl.formatMessage({ id: 'vault.error.editOwnOnly', defaultMessage: "Only your own files have editable details" })
    case 'vault.error.unknownFields': return intl.formatMessage({ id: 'vault.error.unknownFields', defaultMessage: "Cannot change {fields} — editable: {editable}" }, { fields: p.fields!, editable: p.editable! })
    case 'vault.error.emptyName': return intl.formatMessage({ id: 'vault.error.emptyName', defaultMessage: "The name cannot be empty" })
    case 'vault.error.artifactMissing': return intl.formatMessage({ id: 'vault.error.artifactMissing', defaultMessage: "Artifact not found: {id}" }, { id: p.id! })
    case 'vault.error.deleteOwnOnly': return intl.formatMessage({ id: 'vault.error.deleteOwnOnly', defaultMessage: "Only your own files can be deleted here" })
    case 'vault.error.orphanRemoval': return intl.formatMessage({ id: 'vault.error.orphanRemoval', defaultMessage: "{title}: its conversation is gone; removing it from Documents would delete it — only the user can, in Documents" }, { title: p.title! })
    case 'vault.error.soleHomeRemoval': return intl.formatMessage({ id: 'vault.error.soleHomeRemoval', defaultMessage: "{title} is a {kind, select, statement {statement} receipt {receipt} asset {asset file} other {{kind}}}; removing it from Documents would delete it — only the user can, in Documents" }, { title: p.title!, kind: p.kind! })
    case 'vault.error.directRemoval': return intl.formatMessage({ id: 'vault.error.directRemoval', defaultMessage: "{title} was added to Documents directly; removing it would delete it — only the user can, in Documents" }, { title: p.title! })
    case 'vault.error.fileTooLarge': return intl.formatMessage({ id: 'vault.error.fileTooLarge', defaultMessage: "File too large" })
    case 'vault.error.privateNull': return intl.formatMessage({ id: 'vault.error.privateNull', defaultMessage: "Private cannot be null" })
    case 'vault.error.pdfOnly': return intl.formatMessage({ id: 'vault.error.pdfOnly', defaultMessage: "Only a PDF has page previews" })
    case 'vault.error.fileMissing': return intl.formatMessage({ id: 'vault.error.fileMissing', defaultMessage: "The file is missing" })
    case 'vault.error.pdfUnreadable': return intl.formatMessage({ id: 'vault.error.pdfUnreadable', defaultMessage: "This PDF cannot be read — download it instead" })
    case 'vault.error.pdfProtected': return intl.formatMessage({ id: 'vault.error.pdfProtected', defaultMessage: "This PDF is password-protected — download it to open it" })
    case 'vault.error.photoOnly': return intl.formatMessage({ id: 'vault.error.photoOnly', defaultMessage: "Only a photo has a thumbnail" })
    case 'vault.error.photoUnreadable': return intl.formatMessage({ id: 'vault.error.photoUnreadable', defaultMessage: "This photo cannot be read" })
    case 'vault.error.pageMissing': return intl.formatMessage({ id: 'vault.error.pageMissing', defaultMessage: "No page {page} — this PDF has {count}" }, { page: p.page!, count: p.count! })
    case 'vault.error.sheetProtected': return intl.formatMessage({ id: 'vault.error.sheetProtected', defaultMessage: "This spreadsheet is password-protected — download it to open it" })
    case 'vault.error.tableOnly': return intl.formatMessage({ id: 'vault.error.tableOnly', defaultMessage: "Only a CSV or Excel file has a table preview" })
    case 'vault.error.sheetUnreadable': return intl.formatMessage({ id: 'vault.error.sheetUnreadable', defaultMessage: "This spreadsheet cannot be read — download it instead" })
    case 'vault.error.offsetRange': return intl.formatMessage({ id: 'vault.error.offsetRange', defaultMessage: "Offset must be between 0 and {max}" }, { max: p.max! })
    default: return fallback
  }
}
