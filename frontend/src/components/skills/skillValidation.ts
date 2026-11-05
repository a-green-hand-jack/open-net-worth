import type { IntlShape } from 'react-intl'
export interface SkillValidationItem {
  text: string
  message_id?: string
  params?: Record<string, string>
}

/** Only server-identified diagnostics are translated; unknown parser output remains verbatim. */
export function skillValidation(intl: IntlShape, item: SkillValidationItem): string {
  if (
    intl.locale.startsWith('en') ||
    !item.params ||
    typeof item.params !== 'object' ||
    Array.isArray(item.params)
  )
    return item.text
  const p = item.params
  const keys = Object.keys(p)
  if (keys.length === 1 && typeof p.path === 'string') {
    if (item.message_id === 'skills.validation.folderPath')
      return intl.formatMessage(
        {
          id: 'skills.validation.folderPath',
          defaultMessage: 'path {path} resolves outside the skill folder',
        },
        { path: p.path },
      )
    if (item.message_id === 'skills.validation.bundlePath')
      return intl.formatMessage(
        {
          id: 'skills.validation.bundlePath',
          defaultMessage: 'bundle entry {path} resolves outside the skill folder',
        },
        { path: p.path },
      )
    if (item.message_id === 'skills.validation.scriptEscape')
      return intl.formatMessage(
        {
          id: 'skills.validation.scriptEscape',
          defaultMessage: 'script path {path} escapes the scripts directory',
        },
        { path: p.path },
      )
  }
  if (keys.length === 1 && typeof p.field === 'string') {
    switch (item.message_id) {
      case 'skills.validation.fieldString':
        return intl.formatMessage(
          { id: 'skills.validation.fieldString', defaultMessage: '{field} must be a string' },
          { field: p.field },
        )
      case 'skills.validation.fieldBoolean':
        return intl.formatMessage(
          { id: 'skills.validation.fieldBoolean', defaultMessage: '{field} must be a boolean' },
          { field: p.field },
        )
      case 'skills.validation.fieldStringList':
        return intl.formatMessage(
          {
            id: 'skills.validation.fieldStringList',
            defaultMessage: '{field} must be a string or list of strings',
          },
          { field: p.field },
        )
      case 'skills.validation.fieldMap':
        return intl.formatMessage(
          { id: 'skills.validation.fieldMap', defaultMessage: '{field} must be a map' },
          { field: p.field },
        )
      case 'skills.validation.openaiFieldMap':
        return intl.formatMessage(
          {
            id: 'skills.validation.openaiFieldMap',
            defaultMessage: 'OpenAI {field} must be a map',
          },
          { field: p.field },
        )
    }
  }
  if (keys.length === 1 && typeof p.maximum === 'string') {
    switch (item.message_id) {
      case 'skills.validation.nameLength':
        return intl.formatMessage(
          {
            id: 'skills.validation.nameLength',
            defaultMessage: 'name exceeds {maximum} characters',
          },
          { maximum: p.maximum },
        )
      case 'skills.validation.descriptionLength':
        return intl.formatMessage(
          {
            id: 'skills.validation.descriptionLength',
            defaultMessage: 'description exceeds {maximum} characters',
          },
          { maximum: p.maximum },
        )
      case 'skills.validation.compatibilityLength':
        return intl.formatMessage(
          {
            id: 'skills.validation.compatibilityLength',
            defaultMessage: 'compatibility exceeds {maximum} characters',
          },
          { maximum: p.maximum },
        )
    }
  }
  if (
    keys.length === 1 &&
    typeof p.reason === 'string' &&
    item.message_id === 'skills.validation.invalidYaml'
  )
    return intl.formatMessage(
      {
        id: 'skills.validation.invalidYaml',
        defaultMessage: 'agents/openai.yaml is invalid YAML: {reason}',
      },
      { reason: p.reason },
    )
  if (
    keys.length === 1 &&
    typeof p.script === 'string' &&
    item.message_id === 'skills.validation.scriptObject'
  )
    return intl.formatMessage(
      { id: 'skills.validation.scriptObject', defaultMessage: '{script} is not an object' },
      { script: p.script },
    )
  if (
    keys.length === 1 &&
    typeof p.script === 'string' &&
    item.message_id === 'skills.validation.scriptId'
  )
    return intl.formatMessage(
      { id: 'skills.validation.scriptId', defaultMessage: '{script} is missing an id' },
      { script: p.script },
    )
  if (
    keys.length === 1 &&
    typeof p.script === 'string' &&
    item.message_id === 'skills.validation.scriptDuplicate'
  )
    return intl.formatMessage(
      { id: 'skills.validation.scriptDuplicate', defaultMessage: 'duplicate script id {script}' },
      { script: p.script },
    )
  if (
    keys.length === 3 &&
    typeof p.script === 'string' &&
    typeof p.interpreter === 'string' &&
    typeof p.choices === 'string' &&
    item.message_id === 'skills.validation.scriptInterpreter'
  )
    return intl.formatMessage(
      {
        id: 'skills.validation.scriptInterpreter',
        defaultMessage: '{script} has unsupported interpreter {interpreter} (supported: {choices})',
      },
      { script: p.script, interpreter: p.interpreter, choices: p.choices },
    )
  if (
    keys.length === 1 &&
    typeof p.script === 'string' &&
    item.message_id === 'skills.validation.scriptEntry'
  )
    return intl.formatMessage(
      { id: 'skills.validation.scriptEntry', defaultMessage: '{script} is missing an entry' },
      { script: p.script },
    )
  if (
    keys.length === 2 &&
    typeof p.script === 'string' &&
    typeof p.reason === 'string' &&
    item.message_id === 'skills.validation.scriptPath'
  )
    return intl.formatMessage(
      { id: 'skills.validation.scriptPath', defaultMessage: '{script}: {reason}' },
      { script: p.script, reason: p.reason },
    )
  if (
    keys.length === 2 &&
    typeof p.script === 'string' &&
    typeof p.path === 'string' &&
    item.message_id === 'skills.validation.scriptMissing'
  )
    return intl.formatMessage(
      {
        id: 'skills.validation.scriptMissing',
        defaultMessage: '{script} entry {path} does not exist in the skill folder',
      },
      { script: p.script, path: p.path },
    )
  if (
    keys.length === 1 &&
    typeof p.script === 'string' &&
    item.message_id === 'skills.validation.scriptNetwork'
  )
    return intl.formatMessage(
      {
        id: 'skills.validation.scriptNetwork',
        defaultMessage: '{script} requests network access \u2014 network is off in this version',
      },
      { script: p.script },
    )
  if (
    keys.length === 1 &&
    typeof p.script === 'string' &&
    item.message_id === 'skills.validation.scriptTimeout'
  )
    return intl.formatMessage(
      {
        id: 'skills.validation.scriptTimeout',
        defaultMessage: '{script} timeout_s must be a positive number',
      },
      { script: p.script },
    )
  if (
    keys.length === 2 &&
    typeof p.script === 'string' &&
    typeof p.maximum === 'string' &&
    item.message_id === 'skills.validation.scriptTimeoutMax'
  )
    return intl.formatMessage(
      {
        id: 'skills.validation.scriptTimeoutMax',
        defaultMessage: '{script} timeout_s exceeds the {maximum}s ceiling',
      },
      { script: p.script, maximum: p.maximum },
    )
  if (
    keys.length === 1 &&
    typeof p.skill === 'string' &&
    item.message_id === 'skills.validation.scriptFolder'
  )
    return intl.formatMessage(
      {
        id: 'skills.validation.scriptFolder',
        defaultMessage: 'skill folder {skill} was not found on disk',
      },
      { skill: p.skill },
    )
  if (keys.length) return item.text
  switch (item.message_id) {
    case 'skills.validation.bundleVersion':
      return intl.formatMessage({
        id: 'skills.validation.bundleVersion',
        defaultMessage: 'bundle version must not be empty',
      })
    case 'skills.validation.manifestInvalid':
      return intl.formatMessage({
        id: 'skills.validation.manifestInvalid',
        defaultMessage: 'invalid bundle manifest',
      })
    case 'skills.validation.bundleSymlink':
      return intl.formatMessage({
        id: 'skills.validation.bundleSymlink',
        defaultMessage: 'bundle folder must not be a symlink',
      })
    case 'skills.validation.claudeMap':
      return intl.formatMessage({
        id: 'skills.validation.claudeMap',
        defaultMessage: 'Claude Code metadata must be a map',
      })
    case 'skills.validation.openaiMap':
      return intl.formatMessage({
        id: 'skills.validation.openaiMap',
        defaultMessage: 'OpenAI metadata must be a map',
      })
    case 'skills.validation.openaiPolicyBoolean':
      return intl.formatMessage({
        id: 'skills.validation.openaiPolicyBoolean',
        defaultMessage: 'OpenAI policy.allow_implicit_invocation must be a boolean',
      })
    case 'skills.validation.nameRequired':
      return intl.formatMessage({
        id: 'skills.validation.nameRequired',
        defaultMessage: 'frontmatter name is required',
      })
    case 'skills.validation.nameSlug':
      return intl.formatMessage({
        id: 'skills.validation.nameSlug',
        defaultMessage:
          'name must use lowercase letters, numbers and hyphens without leading, trailing, or consecutive hyphens',
      })
    case 'skills.validation.descriptionRequired':
      return intl.formatMessage({
        id: 'skills.validation.descriptionRequired',
        defaultMessage: 'description is required and must be non-empty',
      })
    case 'skills.validation.licenseString':
      return intl.formatMessage({
        id: 'skills.validation.licenseString',
        defaultMessage: 'license must be a string',
      })
    case 'skills.validation.compatibilityString':
      return intl.formatMessage({
        id: 'skills.validation.compatibilityString',
        defaultMessage: 'compatibility must be a string',
      })
    case 'skills.validation.metadataMap':
      return intl.formatMessage({
        id: 'skills.validation.metadataMap',
        defaultMessage: 'metadata must be a map of string keys to string values',
      })
    case 'skills.validation.manifestScripts':
      return intl.formatMessage({
        id: 'skills.validation.manifestScripts',
        defaultMessage: 'manifest scripts must be a list',
      })
    case 'skills.validation.scriptSkillId':
      return intl.formatMessage({
        id: 'skills.validation.scriptSkillId',
        defaultMessage: 'script skill is missing an id (needed to locate its folder)',
      })
    default:
      return item.text
  }
}
