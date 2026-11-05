import type { IntlShape } from 'react-intl'
import { skillValidation, type SkillValidationItem } from './skillValidation'

export interface SkillMessage {
  message_id?: unknown
  message_params?: unknown
  message_items?: unknown
}
export function skillError(
  intl: IntlShape,
  metadata: SkillMessage | null | undefined,
  fallback: string,
): string {
  if (
    intl.locale.startsWith('en') ||
    !metadata ||
    typeof metadata.message_id !== 'string' ||
    !metadata.message_params ||
    typeof metadata.message_params !== 'object' ||
    Array.isArray(metadata.message_params)
  )
    return fallback
  const p = metadata.message_params as Record<string, unknown>
  const keys = Object.keys(p)
  const rawItems = metadata.message_items
  const items =
    Array.isArray(rawItems) &&
    rawItems.every((item) => item && typeof item === 'object' && typeof item.text === 'string')
      ? (rawItems as SkillValidationItem[])
      : null
  const rawItemsText = items?.map((item) => item.text).join('; ')
  const translatedItems = items?.map((item) => skillValidation(intl, item)).join('; ')
  if (
    metadata.message_id === 'skills.error.invalidBundle' &&
    keys.length === 2 &&
    typeof p.reason === 'string' &&
    typeof p.reason_message_id === 'string'
  ) {
    let reason = p.reason
    if (
      p.reason_message_id === 'skills.validation.manifestInvalid' &&
      rawItemsText &&
      translatedItems &&
      p.reason.endsWith(rawItemsText)
    ) {
      reason = `${skillValidation(intl, { text: 'invalid bundle manifest', message_id: p.reason_message_id, params: {} })}: ${translatedItems}`
    }
    return intl.formatMessage(
      { id: 'skills.error.invalidBundle', defaultMessage: 'Invalid skill bundle: {reason}' },
      { reason },
    )
  }
  if (
    metadata.message_id === 'skills.error.validation' &&
    keys.length === 0 &&
    rawItemsText === fallback
  )
    return translatedItems ?? fallback
  if (keys.length === 1 && typeof p.reason === 'string') {
    const reason = rawItemsText === p.reason ? (translatedItems ?? p.reason) : p.reason
    if (metadata.message_id === 'skills.error.invalidSkillFile')
      return intl.formatMessage(
        { id: 'skills.error.invalidSkillFile', defaultMessage: 'Invalid SKILL.md: {reason}' },
        { reason },
      )
    if (metadata.message_id === 'skills.error.invalidOpenaiFile')
      return intl.formatMessage(
        {
          id: 'skills.error.invalidOpenaiFile',
          defaultMessage: 'Invalid agents/openai.yaml: {reason}',
        },
        { reason },
      )
    if (metadata.message_id === 'skills.error.invalidSkill')
      return intl.formatMessage(
        { id: 'skills.error.invalidSkill', defaultMessage: 'Invalid skill: {reason}' },
        { reason },
      )
  }
  if (keys.length === 1 && typeof p.maximum === 'string') {
    if (metadata.message_id === 'skills.error.tooManyFiles')
      return intl.formatMessage(
        {
          id: 'skills.error.tooManyFiles',
          defaultMessage: 'Too many files in the zip (>{maximum})',
        },
        { maximum: p.maximum },
      )
    if (metadata.message_id === 'skills.error.uploadSize')
      return intl.formatMessage(
        {
          id: 'skills.error.uploadSize',
          defaultMessage: 'Upload exceeds the {maximum}-byte limit',
        },
        { maximum: p.maximum },
      )
  }
  if (keys.length === 1 && typeof p.path === 'string') {
    if (metadata.message_id === 'skills.error.symlink')
      return intl.formatMessage(
        { id: 'skills.error.symlink', defaultMessage: 'Zip contains a symlink ({path}) — refused' },
        { path: p.path },
      )
    if (metadata.message_id === 'skills.error.unsafePath')
      return intl.formatMessage(
        { id: 'skills.error.unsafePath', defaultMessage: 'Unsafe path in zip: {path}' },
        { path: p.path },
      )
    if (metadata.message_id === 'skills.error.duplicatePath')
      return intl.formatMessage(
        { id: 'skills.error.duplicatePath', defaultMessage: 'Duplicate path in zip: {path}' },
        { path: p.path },
      )
    if (metadata.message_id === 'skills.error.fileEncoding')
      return intl.formatMessage(
        { id: 'skills.error.fileEncoding', defaultMessage: '{path} must be UTF-8 text' },
        { path: p.path },
      )
  }
  if (
    keys.length === 2 &&
    typeof p.path === 'string' &&
    typeof p.maximum === 'string' &&
    metadata.message_id === 'skills.error.fileTooLarge'
  )
    return intl.formatMessage(
      {
        id: 'skills.error.fileTooLarge',
        defaultMessage: 'File {path} is too large (>{maximum} bytes)',
      },
      { path: p.path, maximum: p.maximum },
    )
  if (keys.length) return fallback
  switch (metadata.message_id) {
    case 'skills.error.network':
      return intl.formatMessage({
        id: 'skills.serverError',
        defaultMessage: 'Could not reach the server.',
      })
    case 'skills.error.invalidList':
      return intl.formatMessage({
        id: 'skills.error.invalidList',
        defaultMessage: 'The server returned an invalid skills list.',
      })
    case 'skills.error.invalidId':
      return intl.formatMessage({
        id: 'skills.error.invalidId',
        defaultMessage: 'Invalid skill identifier',
      })
    case 'skills.error.unknownStarter':
      return intl.formatMessage({
        id: 'skills.error.unknownStarter',
        defaultMessage: 'Unknown starter skill',
      })
    case 'skills.error.managedInstall':
      return intl.formatMessage({
        id: 'skills.error.managedInstall',
        defaultMessage: 'Managed skill-creator install did not persist the skill',
      })
    case 'skills.error.invalidZip':
      return intl.formatMessage({
        id: 'skills.error.invalidZip',
        defaultMessage: 'Not a valid .zip file',
      })
    case 'skills.error.zipTotal':
      return intl.formatMessage({
        id: 'skills.error.zipTotal',
        defaultMessage: 'Zip contents exceed the total size limit',
      })
    case 'skills.error.emptyUpload':
      return intl.formatMessage({ id: 'skills.error.emptyUpload', defaultMessage: 'Empty upload' })
    case 'skills.error.missingSkillFile':
      return intl.formatMessage({
        id: 'skills.error.missingSkillFile',
        defaultMessage: 'Zip must contain a SKILL.md (standard frontmatter + instructions)',
      })
    case 'skills.error.skillEncoding':
      return intl.formatMessage({
        id: 'skills.error.skillEncoding',
        defaultMessage: 'SKILL.md must be UTF-8 text',
      })
    case 'skills.error.openaiEncoding':
      return intl.formatMessage({
        id: 'skills.error.openaiEncoding',
        defaultMessage: 'agents/openai.yaml must be UTF-8 text',
      })
    case 'skills.error.notFound':
      return intl.formatMessage({ id: 'skills.error.notFound', defaultMessage: 'Skill not found' })
    default:
      return fallback
  }
}
