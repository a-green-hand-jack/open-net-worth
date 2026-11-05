import { defineMessages, type IntlShape } from 'react-intl'

const errorParams = defineMessages({
  account: { id: 'automations.errorParam.p0', defaultMessage: 'account' },
  instrument: { id: 'automations.errorParam.p1', defaultMessage: 'instrument' },
  payee: { id: 'automations.errorParam.p2', defaultMessage: 'payee' },
  kind: { id: 'automations.errorParam.p3', defaultMessage: 'kind' },
  amount: { id: 'automations.errorParam.p4', defaultMessage: 'amount' },
  description: { id: 'automations.errorParam.p5', defaultMessage: 'description' },
  memo: { id: 'automations.errorParam.p6', defaultMessage: 'memo' },
  'transaction account': { id: 'automations.errorParam.p7', defaultMessage: 'transaction account' },
  'transaction event direction': {
    id: 'automations.errorParam.p8',
    defaultMessage: 'transaction event direction',
  },
  'transaction event kind': {
    id: 'automations.errorParam.p9',
    defaultMessage: 'transaction event kind',
  },
  'transaction event contains': {
    id: 'automations.errorParam.p10',
    defaultMessage: 'transaction event contains',
  },
  'transaction event description_contains': {
    id: 'automations.errorParam.p11',
    defaultMessage: 'transaction event description_contains',
  },
  'transaction event memo_contains': {
    id: 'automations.errorParam.p12',
    defaultMessage: 'transaction event memo_contains',
  },
  'transaction event description_regex': {
    id: 'automations.errorParam.p13',
    defaultMessage: 'transaction event description_regex',
  },
  'transaction event memo_regex': {
    id: 'automations.errorParam.p14',
    defaultMessage: 'transaction event memo_regex',
  },
  'transaction event keywords': {
    id: 'automations.errorParam.p15',
    defaultMessage: 'transaction event keywords',
  },
  'transaction event memo_keywords': {
    id: 'automations.errorParam.p16',
    defaultMessage: 'transaction event memo_keywords',
  },
  'transaction event over': {
    id: 'automations.errorParam.p17',
    defaultMessage: 'transaction event over',
  },
  'transaction event min_amount': {
    id: 'automations.errorParam.p18',
    defaultMessage: 'transaction event min_amount',
  },
  'transaction event max_amount': {
    id: 'automations.errorParam.p19',
    defaultMessage: 'transaction event max_amount',
  },
  'balance event account': {
    id: 'automations.errorParam.p20',
    defaultMessage: 'balance event account',
  },
  'balance event direction': {
    id: 'automations.errorParam.p21',
    defaultMessage: 'balance event direction',
  },
  'balance event amount': {
    id: 'automations.errorParam.p22',
    defaultMessage: 'balance event amount',
  },
  'price event symbol': { id: 'automations.errorParam.p23', defaultMessage: 'price event symbol' },
  'price event direction': {
    id: 'automations.errorParam.p24',
    defaultMessage: 'price event direction',
  },
  'price event value': { id: 'automations.errorParam.p25', defaultMessage: 'price event value' },
  'once at': { id: 'automations.errorParam.p26', defaultMessage: 'once at' },
  'rrule dtstart': { id: 'automations.errorParam.p27', defaultMessage: 'rrule dtstart' },
  is: { id: 'automations.errorParam.p28', defaultMessage: 'is' },
  is_not: { id: 'automations.errorParam.p29', defaultMessage: 'is_not' },
  over: { id: 'automations.errorParam.p30', defaultMessage: 'over' },
  under: { id: 'automations.errorParam.p31', defaultMessage: 'under' },
  contains: { id: 'automations.errorParam.p32', defaultMessage: 'contains' },
  not_contains: { id: 'automations.errorParam.p33', defaultMessage: 'not_contains' },
  starts_with: { id: 'automations.errorParam.p34', defaultMessage: 'starts_with' },
  regex: { id: 'automations.errorParam.p35', defaultMessage: 'regex' },
  expense: { id: 'automations.errorParam.p36', defaultMessage: 'expense' },
  income: { id: 'automations.errorParam.p37', defaultMessage: 'income' },
  transfer: { id: 'automations.errorParam.p38', defaultMessage: 'transfer' },
  investment: { id: 'automations.errorParam.p39', defaultMessage: 'investment' },
  adjustment: { id: 'automations.errorParam.p40', defaultMessage: 'adjustment' },
  above: { id: 'automations.errorParam.p41', defaultMessage: 'above' },
  below: { id: 'automations.errorParam.p42', defaultMessage: 'below' },
  move: { id: 'automations.errorParam.p43', defaultMessage: 'move' },
  rise: { id: 'automations.errorParam.p44', defaultMessage: 'rise' },
  fall: { id: 'automations.errorParam.p45', defaultMessage: 'fall' },
  create: { id: 'automations.errorParam.p46', defaultMessage: 'create' },
  update: { id: 'automations.errorParam.p47', defaultMessage: 'update' },
  delete: { id: 'automations.errorParam.p48', defaultMessage: 'delete' },
})
function errorParam(intl: IntlShape, value: string): string {
  const descriptor = errorParams[value as keyof typeof errorParams]
  return descriptor ? intl.formatMessage(descriptor) : value
}
function errorChoices(intl: IntlShape, value: string): string {
  return value
    .split(', ')
    .map((item) => errorParam(intl, item))
    .join(', ')
}

export function automationError(intl: IntlShape, error: unknown, fallback: string): string {
  const original = error instanceof Error && error.message ? error.message : fallback
  if (!(error instanceof Error) || intl.locale.startsWith('en')) return original
  const details = error as Error & { messageId?: string; messageParams?: Record<string, unknown> }
  if (
    !details.messageParams ||
    typeof details.messageParams !== 'object' ||
    Array.isArray(details.messageParams)
  )
    return original
  const params = details.messageParams
  const keys = Object.keys(params)
  if (
    keys.length === 1 &&
    typeof params.maximum === 'string' &&
    details.messageId === 'automation.error.conditionsMaximum'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionsMaximum',
        defaultMessage: 'transaction event allows at most {maximum} conditions',
      },
      { maximum: params.maximum },
    )
  if (
    keys.length === 1 &&
    typeof params.fields === 'string' &&
    details.messageId === 'automation.error.conditionFields'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionFields',
        defaultMessage: 'condition field must be one of {fields}',
      },
      { fields: params.fields },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.choices === 'string' &&
    details.messageId === 'automation.error.conditionOperation'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionOperation',
        defaultMessage: '{field} condition op must be one of {choices}',
      },
      { field: errorParam(intl, params.field), choices: errorChoices(intl, params.choices) },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.operation === 'string' &&
    details.messageId === 'automation.error.conditionPhrase'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionPhrase',
        defaultMessage: '{field} {operation} needs at least one phrase',
      },
      { field: errorParam(intl, params.field), operation: errorParam(intl, params.operation) },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.operation === 'string' &&
    details.messageId === 'automation.error.conditionValue'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionValue',
        defaultMessage: '{field} {operation} needs a value',
      },
      { field: errorParam(intl, params.field), operation: errorParam(intl, params.operation) },
    )
  if (
    keys.length === 1 &&
    typeof params.maximum === 'string' &&
    details.messageId === 'automation.error.patternMaximum'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.patternMaximum',
        defaultMessage: 'a pattern is at most {maximum} characters',
      },
      { maximum: params.maximum },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.reason === 'string' &&
    details.messageId === 'automation.error.patternInvalid'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.patternInvalid',
        defaultMessage: 'invalid {field} pattern: {reason}',
      },
      { field: errorParam(intl, params.field), reason: params.reason },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.conditionValueList'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionValueList',
        defaultMessage: '{field} condition needs a value or a list of values',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.maximum === 'string' &&
    details.messageId === 'automation.error.conditionMaximum'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionMaximum',
        defaultMessage: 'a {field} condition takes at most {maximum} values',
      },
      { field: errorParam(intl, params.field), maximum: params.maximum },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.conditionOneValue'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionOneValue',
        defaultMessage:
          'A transaction has one {field}, so these cannot both be true \u2014 pick both in one condition instead.',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.conditionExcluded'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conditionExcluded',
        defaultMessage:
          '\u201cIs\u201d and \u201cis not\u201d rule out every {field} here, so this can never match.',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 2 &&
    typeof params.lower === 'string' &&
    typeof params.upper === 'string' &&
    details.messageId === 'automation.error.amountConflict'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.amountConflict',
        defaultMessage:
          'An amount cannot be over {lower} and under {upper} at once, so this can never match.',
      },
      { lower: params.lower, upper: params.upper },
    )
  if (
    keys.length === 1 &&
    typeof params.noun === 'string' &&
    details.messageId === 'automation.error.referenceRequired'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.referenceRequired',
        defaultMessage: 'automation {noun} reference must be a non-empty string',
      },
      { noun: errorParam(intl, params.noun) },
    )
  if (
    keys.length === 3 &&
    typeof params.noun === 'string' &&
    typeof params.reference === 'string' &&
    typeof params.ids === 'string' &&
    details.messageId === 'automation.error.referenceAmbiguous'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.referenceAmbiguous',
        defaultMessage: 'automation {noun} reference {reference} is ambiguous: {ids}',
      },
      { noun: errorParam(intl, params.noun), reference: params.reference, ids: params.ids },
    )
  if (
    keys.length === 3 &&
    typeof params.noun === 'string' &&
    typeof params.reference === 'string' &&
    typeof params.choices === 'string' &&
    details.messageId === 'automation.error.referenceMissing'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.referenceMissing',
        defaultMessage:
          'automation {noun} reference {reference} does not match a persisted choice. {choices}',
      },
      {
        noun: errorParam(intl, params.noun),
        reference: params.reference,
        choices:
          params.choices ||
          intl.formatMessage({
            id: 'automations.error.noChoices',
            defaultMessage: 'No persisted choices are available.',
          }),
      },
    )
  if (
    keys.length === 1 &&
    typeof params.fields === 'string' &&
    details.messageId === 'automation.error.permissionFields'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.permissionFields',
        defaultMessage: 'unknown automation permission fields: {fields}',
      },
      { fields: params.fields },
    )
  if (
    keys.length === 1 &&
    typeof params.fields === 'string' &&
    details.messageId === 'automation.error.unknownFields'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.unknownFields',
        defaultMessage: 'unknown automation fields: {fields}',
      },
      { fields: params.fields },
    )
  if (
    keys.length === 1 &&
    typeof params.tools === 'string' &&
    details.messageId === 'automation.error.conflictingTools'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.conflictingTools',
        defaultMessage:
          'a tool cannot be both always allowed and blocked in one Automation: {tools}',
      },
      { tools: params.tools },
    )
  if (
    keys.length === 1 &&
    typeof params.event === 'string' &&
    details.messageId === 'automation.error.unknownEvent'
  )
    return intl.formatMessage(
      { id: 'automations.error.unknownEvent', defaultMessage: 'unknown automation event {event}' },
      { event: params.event },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldString'
  )
    return intl.formatMessage(
      { id: 'automations.error.fieldString', defaultMessage: '{field} must be a non-empty string' },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldRequired'
  )
    return intl.formatMessage(
      { id: 'automations.error.fieldRequired', defaultMessage: '{field} is required' },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldAliases'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.fieldAliases',
        defaultMessage: '{field} aliases must refer to the same value',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldStringOrNull'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.fieldStringOrNull',
        defaultMessage: '{field} must be a non-empty string or null',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldStringList'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.fieldStringList',
        defaultMessage: '{field} must be a list of non-empty strings or null',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldFinite'
  )
    return intl.formatMessage(
      { id: 'automations.error.fieldFinite', defaultMessage: '{field} must be a finite number' },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldNonnegative'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.fieldNonnegative',
        defaultMessage: '{field} must be a non-negative number',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.fieldNonnegativeInteger'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.fieldNonnegativeInteger',
        defaultMessage: '{field} must be a non-negative integer',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 1 &&
    typeof params.kind === 'string' &&
    details.messageId === 'automation.error.triggerKind'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.triggerKind',
        defaultMessage:
          'unknown automation trigger kind {kind}; expected manual, schedule, or event',
      },
      { kind: params.kind },
    )
  if (
    keys.length === 1 &&
    typeof params.kind === 'string' &&
    details.messageId === 'automation.error.scheduleType'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.scheduleType',
        defaultMessage:
          'unknown automation schedule type {kind}; expected once, daily, weekdays, weekly, monthly, interval, or rrule',
      },
      { kind: params.kind },
    )
  if (
    keys.length === 1 &&
    typeof params.minimum === 'string' &&
    details.messageId === 'automation.error.intervalMinimum'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.intervalMinimum',
        defaultMessage: 'interval seconds must be at least {minimum}',
      },
      { minimum: params.minimum },
    )
  if (
    keys.length === 1 &&
    typeof params.reason === 'string' &&
    details.messageId === 'automation.error.invalidRrule'
  )
    return intl.formatMessage(
      { id: 'automations.error.invalidRrule', defaultMessage: 'invalid rrule: {reason}' },
      { reason: params.reason },
    )
  if (
    keys.length === 1 &&
    typeof params.keys === 'string' &&
    details.messageId === 'automation.error.triggerKeys'
  )
    return intl.formatMessage(
      { id: 'automations.error.triggerKeys', defaultMessage: 'unknown trigger keys: {keys}' },
      { keys: params.keys },
    )
  if (
    keys.length === 1 &&
    typeof params.timezone === 'string' &&
    details.messageId === 'automation.error.timezoneUnknown'
  )
    return intl.formatMessage(
      { id: 'automations.error.timezoneUnknown', defaultMessage: 'unknown timezone {timezone}' },
      { timezone: params.timezone },
    )
  if (
    keys.length === 1 &&
    typeof params.field === 'string' &&
    details.messageId === 'automation.error.datetimeRequired'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.datetimeRequired',
        defaultMessage: '{field} requires an ISO-8601 datetime',
      },
      { field: errorParam(intl, params.field) },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.choices === 'string' &&
    details.messageId === 'automation.error.fieldChoices'
  )
    return intl.formatMessage(
      { id: 'automations.error.fieldChoices', defaultMessage: '{field} must be one of: {choices}' },
      { field: errorParam(intl, params.field), choices: errorChoices(intl, params.choices) },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.maximum === 'string' &&
    details.messageId === 'automation.error.fieldMaximum'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.fieldMaximum',
        defaultMessage: '{field} must be no greater than {maximum}',
      },
      { field: errorParam(intl, params.field), maximum: params.maximum },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.reason === 'string' &&
    details.messageId === 'automation.error.invalidField'
  )
    return intl.formatMessage(
      { id: 'automations.error.invalidField', defaultMessage: 'invalid {field}: {reason}' },
      { field: errorParam(intl, params.field), reason: params.reason },
    )
  if (
    keys.length === 2 &&
    typeof params.field === 'string' &&
    typeof params.value === 'string' &&
    details.messageId === 'automation.error.datetimeInvalid'
  )
    return intl.formatMessage(
      {
        id: 'automations.error.datetimeInvalid',
        defaultMessage: 'invalid {field} datetime {value}',
      },
      { field: errorParam(intl, params.field), value: params.value },
    )
  if (keys.length === 1 && typeof params.kind === 'string') {
    switch (details.messageId) {
      case 'automation.error.executionKind':
        return intl.formatMessage(
          {
            id: 'automations.error.executionKind',
            defaultMessage: 'unknown execution kind {kind}',
          },
          { kind: params.kind },
        )
      case 'automation.error.transactionKind':
        return intl.formatMessage(
          {
            id: 'automations.error.transactionKind',
            defaultMessage: 'transaction template has unknown kind {kind}',
          },
          { kind: params.kind },
        )
      case 'automation.error.transactionBothLegs':
        return intl.formatMessage(
          {
            id: 'automations.error.transactionBothLegs',
            defaultMessage: '{kind} transaction template requires both account legs',
          },
          { kind: params.kind },
        )
      case 'automation.error.transactionNoCategory':
        return intl.formatMessage(
          {
            id: 'automations.error.transactionNoCategory',
            defaultMessage: '{kind} transaction template must not carry a category',
          },
          { kind: params.kind },
        )
      case 'automation.error.unsupportedExecution':
        return intl.formatMessage(
          {
            id: 'automations.error.unsupportedExecution',
            defaultMessage: 'unsupported deterministic execution kind {kind}',
          },
          { kind: params.kind },
        )
    }
  }
  if (
    keys.length === 1 &&
    typeof params.keys === 'string' &&
    details.messageId === 'automation.error.executionKeys'
  )
    return intl.formatMessage(
      { id: 'automations.error.executionKeys', defaultMessage: 'unknown execution keys: {keys}' },
      { keys: params.keys },
    )
  if (keys.length === 1 && typeof params.id === 'string') {
    if (details.messageId === 'automation.error.notFound')
      return intl.formatMessage(
        { id: 'automations.error.notFound', defaultMessage: 'automation {id} not found' },
        { id: params.id },
      )
    if (details.messageId === 'automation.error.alreadyRunning')
      return intl.formatMessage(
        {
          id: 'automations.error.alreadyRunning',
          defaultMessage: 'automation {id} is already running',
        },
        { id: params.id },
      )
    if (details.messageId === 'automation.error.changedDuringDelete')
      return intl.formatMessage(
        {
          id: 'automations.error.changedDuringDelete',
          defaultMessage: 'automation {id} changed during delete',
        },
        { id: params.id },
      )
  }
  if (keys.length) return original
  switch (details.messageId) {
    case 'automation.error.completedStatus':
      return intl.formatMessage({
        id: 'automations.error.completedStatus',
        defaultMessage:
          "automation status 'completed' is set when a schedule runs out, never by a caller",
      })
    case 'automation.error.noFutureRun':
      return intl.formatMessage({
        id: 'automations.error.noFutureRun',
        defaultMessage:
          'this automation has no future run — give it a new date or schedule to run it again',
      })
    case 'automation.error.startingDuringDelete':
      return intl.formatMessage({
        id: 'automations.error.startingDuringDelete',
        defaultMessage:
          'automation is currently starting; wait for the run to be recorded before deleting it',
      })
    case 'automation.error.runningDuringDelete':
      return intl.formatMessage({
        id: 'automations.error.runningDuringDelete',
        defaultMessage:
          'automation is currently running; wait for the turn to finish before deleting it',
      })
    case 'automation.error.object':
      return intl.formatMessage({
        id: 'automations.error.object',
        defaultMessage: 'automation must be an object',
      })
    case 'automation.error.nameRequired':
      return intl.formatMessage({
        id: 'automations.error.nameRequired',
        defaultMessage: 'automation name is required',
      })
    case 'automation.error.instructionsRequired':
      return intl.formatMessage({
        id: 'automations.error.instructionsRequired',
        defaultMessage: 'automation instructions are required',
      })
    case 'automation.error.permissionMode':
      return intl.formatMessage({
        id: 'automations.error.permissionMode',
        defaultMessage: 'automation permission_mode must be manual, auto, or skip',
      })
    case 'automation.error.status':
      return intl.formatMessage({
        id: 'automations.error.status',
        defaultMessage: 'automation status must be active or paused',
      })
    case 'automation.error.maxRuns':
      return intl.formatMessage({
        id: 'automations.error.maxRuns',
        defaultMessage: 'automation max_runs must be a positive integer or null',
      })
    case 'automation.error.effort':
      return intl.formatMessage({
        id: 'automations.error.effort',
        defaultMessage: 'automation effort is invalid',
      })
    case 'automation.error.provenance':
      return intl.formatMessage({
        id: 'automations.error.provenance',
        defaultMessage: 'automation provenance must be an object',
      })
    case 'automation.error.permissionsList':
      return intl.formatMessage({
        id: 'automations.error.permissionsList',
        defaultMessage: 'automation always_allowed permissions must be a list',
      })
    case 'automation.error.permissionObject':
      return intl.formatMessage({
        id: 'automations.error.permissionObject',
        defaultMessage: 'automation always_allowed permission must be an object',
      })
    case 'automation.error.permissionSource':
      return intl.formatMessage({
        id: 'automations.error.permissionSource',
        defaultMessage: 'automation always_allowed permission requires source and description',
      })
    case 'automation.error.permissionCapability':
      return intl.formatMessage({
        id: 'automations.error.permissionCapability',
        defaultMessage: 'automation permission capability must be a non-empty string',
      })
    case 'automation.error.permissionTools':
      return intl.formatMessage({
        id: 'automations.error.permissionTools',
        defaultMessage: 'automation permission tools must be a list of tool names',
      })
    case 'automation.error.blockedTools':
      return intl.formatMessage({
        id: 'automations.error.blockedTools',
        defaultMessage: 'automation blocked must be a list of tool names',
      })
    case 'automation.error.executionLucius':
      return intl.formatMessage({
        id: 'automations.error.executionLucius',
        defaultMessage: 'automation execution must use Lucius',
      })
    case 'automation.error.unknownChange':
      return intl.formatMessage({
        id: 'automations.error.unknownChange',
        defaultMessage: 'unknown Automation change',
      })
    case 'automation.error.cleanupOwnership':
      return intl.formatMessage({
        id: 'automations.error.cleanupOwnership',
        defaultMessage: 'automation cleanup ownership could not be proved',
      })
    case 'automation.error.deletionManifest':
      return intl.formatMessage({
        id: 'automations.error.deletionManifest',
        defaultMessage: 'automation deletion manifest is invalid',
      })
    case 'automation.error.dependencyCleanup':
      return intl.formatMessage({
        id: 'automations.error.dependencyCleanup',
        defaultMessage: 'automation dependency cleanup failed',
      })
    case 'automation.error.runtimeCleanup':
      return intl.formatMessage({
        id: 'automations.error.runtimeCleanup',
        defaultMessage: 'automation runtime cleanup failed',
      })
    case 'automation.error.runCleanup':
      return intl.formatMessage({
        id: 'automations.error.runCleanup',
        defaultMessage: 'automation run cleanup failed',
      })
    case 'automation.error.systemKey':
      return intl.formatMessage({
        id: 'automations.error.systemKey',
        defaultMessage: 'system Automation key is required',
      })
    case 'automation.error.conversationMissing':
      return intl.formatMessage({
        id: 'automations.error.conversationMissing',
        defaultMessage: 'automation conversation not found',
      })
    case 'automation.error.conversationBusy':
      return intl.formatMessage({
        id: 'automations.error.conversationBusy',
        defaultMessage: 'automation conversation is already processing a turn',
      })
    case 'automation.error.previousFinalizing':
      return intl.formatMessage({
        id: 'automations.error.previousFinalizing',
        defaultMessage: 'the previous Automation turn is still finalizing',
      })
    case 'automation.error.executionObject':
      return intl.formatMessage({
        id: 'automations.error.executionObject',
        defaultMessage: 'execution must be an object',
      })
    case 'automation.error.notifyMessage':
      return intl.formatMessage({
        id: 'automations.error.notifyMessage',
        defaultMessage: 'notify execution requires message',
      })
    case 'automation.error.agentId':
      return intl.formatMessage({
        id: 'automations.error.agentId',
        defaultMessage: 'agent execution requires agent_id',
      })
    case 'automation.error.cardAccount':
      return intl.formatMessage({
        id: 'automations.error.cardAccount',
        defaultMessage: 'card payment guard requires card_account_id',
      })
    case 'automation.error.transformSet':
      return intl.formatMessage({
        id: 'automations.error.transformSet',
        defaultMessage: 'transaction transform requires set',
      })
    case 'automation.error.transformPriority':
      return intl.formatMessage({
        id: 'automations.error.transformPriority',
        defaultMessage: 'transaction transform priority must be an integer',
      })
    case 'automation.error.transformFlags':
      return intl.formatMessage({
        id: 'automations.error.transformFlags',
        defaultMessage: 'transaction transform flags must be booleans',
      })
    case 'automation.error.executionChannels':
      return intl.formatMessage({
        id: 'automations.error.executionChannels',
        defaultMessage: 'execution channels must be a list of strings',
      })
    case 'automation.error.transactionTemplate':
      return intl.formatMessage({
        id: 'automations.error.transactionTemplate',
        defaultMessage: 'transaction execution requires a transaction template',
      })
    case 'automation.error.transactionAmount':
      return intl.formatMessage({
        id: 'automations.error.transactionAmount',
        defaultMessage: 'transaction template requires a positive amount',
      })
    case 'automation.error.expenseSource':
      return intl.formatMessage({
        id: 'automations.error.expenseSource',
        defaultMessage: 'expense transaction template requires from_account_id',
      })
    case 'automation.error.incomeDestination':
      return intl.formatMessage({
        id: 'automations.error.incomeDestination',
        defaultMessage: 'income transaction template requires to_account_id',
      })
    case 'automation.error.investmentLeg':
      return intl.formatMessage({
        id: 'automations.error.investmentLeg',
        defaultMessage: 'investment transaction template requires exactly one account leg',
      })
    case 'automation.error.triggerObject':
      return intl.formatMessage({
        id: 'automations.error.triggerObject',
        defaultMessage: 'trigger must be an object',
      })
    case 'automation.error.triggerWhen':
      return intl.formatMessage({
        id: 'automations.error.triggerWhen',
        defaultMessage: "event trigger requires an object 'when'",
      })
    case 'automation.error.triggerLimit':
      return intl.formatMessage({
        id: 'automations.error.triggerLimit',
        defaultMessage: 'event trigger limit must be each, hour, or day',
      })
    case 'automation.error.triggerSequence':
      return intl.formatMessage({
        id: 'automations.error.triggerSequence',
        defaultMessage: 'event trigger sequence must be an object',
      })
    case 'automation.error.triggerGroup':
      return intl.formatMessage({
        id: 'automations.error.triggerGroup',
        defaultMessage: 'event trigger sequence requires a group',
      })
    case 'automation.error.triggerPriority':
      return intl.formatMessage({
        id: 'automations.error.triggerPriority',
        defaultMessage: 'event trigger sequence priority must be an integer',
      })
    case 'automation.error.triggerStop':
      return intl.formatMessage({
        id: 'automations.error.triggerStop',
        defaultMessage: 'event trigger sequence stop must be a boolean',
      })
    case 'automation.error.transactionOperation':
      return intl.formatMessage({
        id: 'automations.error.transactionOperation',
        defaultMessage: 'transaction event operation must be create, update, delete, or a list',
      })
    case 'automation.error.transactionCurrency':
      return intl.formatMessage({
        id: 'automations.error.transactionCurrency',
        defaultMessage: 'transaction event currency must be a 3-letter code',
      })
    case 'automation.error.transactionRange':
      return intl.formatMessage({
        id: 'automations.error.transactionRange',
        defaultMessage: 'transaction event min_amount cannot be greater than max_amount',
      })
    case 'automation.error.priceValue':
      return intl.formatMessage({
        id: 'automations.error.priceValue',
        defaultMessage: 'price event requires value',
      })
    case 'automation.error.weeklyDay':
      return intl.formatMessage({
        id: 'automations.error.weeklyDay',
        defaultMessage: 'weekly schedule day must be mon through sun',
      })
    case 'automation.error.monthlyDay':
      return intl.formatMessage({
        id: 'automations.error.monthlyDay',
        defaultMessage: 'monthly schedule day must be 1 through 31',
      })
    case 'automation.error.intervalInteger':
      return intl.formatMessage({
        id: 'automations.error.intervalInteger',
        defaultMessage: 'interval schedule requires integer seconds',
      })
    case 'automation.error.rruleBody':
      return intl.formatMessage({
        id: 'automations.error.rruleBody',
        defaultMessage: 'rrule must be a non-empty body without a leading RRULE:',
      })
    case 'automation.error.rruleFrequencyRequired':
      return intl.formatMessage({
        id: 'automations.error.rruleFrequencyRequired',
        defaultMessage: 'rrule requires FREQ',
      })
    case 'automation.error.rruleFrequency':
      return intl.formatMessage({
        id: 'automations.error.rruleFrequency',
        defaultMessage: 'rrule frequency must not be sub-minute',
      })
    case 'automation.error.timezoneRequired':
      return intl.formatMessage({
        id: 'automations.error.timezoneRequired',
        defaultMessage: 'tzid must be a non-empty IANA timezone name',
      })
    case 'automation.error.scheduleTime':
      return intl.formatMessage({
        id: 'automations.error.scheduleTime',
        defaultMessage: 'schedule time must be HH:MM',
      })
    case 'automation.error.conditionsList':
      return intl.formatMessage({
        id: 'automations.error.conditionsList',
        defaultMessage: 'transaction event conditions must be a list',
      })
    case 'automation.error.conditionShape':
      return intl.formatMessage({
        id: 'automations.error.conditionShape',
        defaultMessage: 'a condition requires field, op and value',
      })
    case 'automation.error.amountNumber':
      return intl.formatMessage({
        id: 'automations.error.amountNumber',
        defaultMessage: 'amount condition needs a number',
      })
    case 'automation.error.amountNonnegative':
      return intl.formatMessage({
        id: 'automations.error.amountNonnegative',
        defaultMessage: 'amount condition needs a non-negative number',
      })
    default:
      return original
  }
}
