import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
// A transaction trigger's conditions: each picks a field (account, kind, amount, payee,
// description, memo), an operation that fits it, and a value. Every condition must hold.
// Stored as `when.conditions`; an older trigger's flat keys are shown as conditions too and
// rewritten as conditions on the first edit. Account, Kind and Payee pick several values (any
// of / none of them); conditions that can never all hold are flagged under the one that closes
// the trap.
import type { AutomationOption } from '../../../api/automations'
import { Cluster, Tag } from '../../ui'
import { Input, Row, Select } from './automationFormControls'
import { conditionConflicts } from './txnConditionConflicts'
import {
  CONDITION_FIELDS,
  FLAT_FILTER_KEYS,
  KIND_OPTIONS,
  conditionAccount,
  conditionValueText,
  conditionValues,
  newCondition,
  opsFor,
  readConditions,
  storedValues,
  takesSeveral,
  type ConditionField,
  type TxnCondition,
} from './txnConditions'
import { Plus } from '../../../ui/icons'

export function TransactionConditionFields({
  when,
  accounts,
  payees,
  baseCurrency,
  onChange,
}: {
  when: Record<string, unknown>
  accounts: AutomationOption[]
  payees: AutomationOption[]
  baseCurrency?: string
  onChange: (patch: Record<string, unknown>, path: string) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const conditions = readConditions(when)
  const write = (next: TxnCondition[]) =>
    onChange(
      {
        ...Object.fromEntries(FLAT_FILTER_KEYS.map((key) => [key, undefined])),
        conditions: next.length ? next : undefined,
      },
      'trigger.when.conditions',
    )
  const update = (index: number, next: TxnCondition) =>
    write(conditions.map((c, i) => (i === index ? next : c)))
  const account = conditionAccount(conditions)
  const amountCurrency =
    (account ? accounts.find((a) => a.id === account)?.currency : baseCurrency) ?? ''
  const conflicts = conditionConflicts(conditions)
  return (
    <>
      {conditions.map((condition, index) => (
        <ConditionRows
          key={index}
          index={index}
          condition={condition}
          accounts={accounts}
          payees={payees}
          amountCurrency={amountCurrency}
          warnings={conflicts.filter((c) => c.index === index).map((c) => conflictLabel(c, intl))}
          onChange={(next) => update(index, next)}
          onRemove={() => write(conditions.filter((_, i) => i !== index))}
        />
      ))}
      <Row
        label={
          conditions.length
            ? ''
            : formatMessage({ id: 'automations.form.conditions', defaultMessage: 'Conditions' })
        }
        htmlFor="automation-add-condition"
      >
        <button
          id="automation-add-condition"
          type="button"
          className="a3-linkbtn"
          onClick={() => write([...conditions, newCondition('payee')])}
        >
          <Plus size={13} aria-hidden="true" />{' '}
          {formatMessage({ id: 'automations.condition.add', defaultMessage: 'Add condition' })}
        </button>
      </Row>
    </>
  )
}

function ConditionRows({
  index,
  condition,
  accounts,
  payees,
  amountCurrency,
  warnings,
  onChange,
  onRemove,
}: {
  index: number
  condition: TxnCondition
  accounts: AutomationOption[]
  payees: AutomationOption[]
  amountCurrency: string
  warnings: string[]
  onChange: (next: TxnCondition) => void
  onRemove: () => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const id = `automation-condition-${index}`
  const setValue = (value: TxnCondition['value']) => onChange({ ...condition, value })
  const several = takesSeveral(condition)
  const options = pickOptions(condition.field, accounts, payees).map(
    ([key, label]) =>
      [key, condition.field === 'kind' ? conditionKindLabel(intl, key, label) : label] as const,
  )
  const picked = several ? conditionValues(condition.value) : []
  const below = (
    <>
      {(condition.op === 'contains' || condition.op === 'not_contains') && (
        <span className="a3-muted">
          {formatMessage({
            id: 'automations.condition.commas',
            defaultMessage: 'Separate several with commas — any of them counts.',
          })}
        </span>
      )}
      {picked.length > 0 && (
        <Cluster gap="--space-2">
          {picked.map((value) => {
            const label = options.find(([key]) => key === value)?.[1] ?? value
            return (
              <Tag
                key={value}
                removeLabel={formatMessage(
                  { id: 'automations.condition.removeLabel', defaultMessage: 'Remove {label}' },
                  { label },
                )}
                onRemove={() => setValue(storedValues(picked.filter((v) => v !== value)))}
              >
                {label}
              </Tag>
            )
          })}
        </Cluster>
      )}
      {warnings.map((warning) => (
        <span key={warning} className="a3-inline-error" role="status">
          {warning}
        </span>
      ))}
    </>
  )
  const hasBelow =
    condition.op === 'contains' ||
    condition.op === 'not_contains' ||
    picked.length > 0 ||
    warnings.length > 0
  return (
    <>
      <Row
        label={
          index === 0
            ? formatMessage({ id: 'automations.condition.where', defaultMessage: 'Where' })
            : formatMessage({ id: 'automations.condition.and', defaultMessage: 'and' })
        }
        htmlFor={`${id}-field`}
      >
        <div className="a3-cond-pair">
          <Select
            id={`${id}-field`}
            value={condition.field}
            options={CONDITION_FIELDS.map(
              ([key, label]) => [key, conditionFieldLabel(intl, key, label)] as const,
            )}
            onChange={(field) => onChange(newCondition(field as ConditionField))}
          />
          <Select
            id={`${id}-op`}
            value={condition.op}
            options={opsFor(condition.field, picked.length > 1).map(
              ([key, label]) =>
                [key, conditionOpLabel(intl, key, label, picked.length > 1)] as const,
            )}
            onChange={(op) => onChange({ ...condition, op })}
          />
        </div>
        <button type="button" className="a3-linkbtn" onClick={onRemove}>
          {formatMessage({ id: 'automations.condition.remove', defaultMessage: 'Remove' })}
        </button>
      </Row>
      <Row
        label=""
        htmlFor={`${id}-value`}
        unit={condition.field === 'amount' ? amountCurrency : undefined}
        below={hasBelow ? below : undefined}
      >
        {several ? (
          <Select
            id={`${id}-value`}
            value=""
            options={options.filter(([key]) => !picked.includes(key))}
            placeholder={pickPlaceholder(condition.field, picked.length > 0, intl)}
            onChange={(value) => value && setValue(storedValues([...picked, value]))}
          />
        ) : (
          <ConditionValue id={`${id}-value`} condition={condition} onChange={setValue} />
        )}
      </Row>
    </>
  )
}

const NOUN: Partial<Record<ConditionField, string>> = {
  account: 'an account',
  kind: 'a kind',
  payee: 'a payee',
}

function pickPlaceholder(field: ConditionField, more: boolean, intl: IntlShape) {
  if (!intl.locale.startsWith('en'))
    return intl.formatMessage(
      more
        ? {
            id: 'automations.condition.chooseAnother',
            defaultMessage: 'Or choose another {field}…',
          }
        : { id: 'automations.condition.choose', defaultMessage: 'Choose {field}' },
      { field: conditionFieldLabel(intl, field, field) },
    )
  const noun = NOUN[field] ?? 'a value'
  return more ? `Or ${noun.replace(/^an? /, 'another ')}…` : `Choose ${noun}`
}

function pickOptions(
  field: ConditionField,
  accounts: AutomationOption[],
  payees: AutomationOption[],
): ReadonlyArray<readonly [string, string]> {
  if (field === 'kind') return KIND_OPTIONS
  const list = field === 'account' ? accounts : field === 'payee' ? payees : []
  return list.map((option) => [option.id, option.label] as const)
}

function ConditionValue({
  id,
  condition,
  onChange,
}: {
  id: string
  condition: TxnCondition
  onChange: (value: TxnCondition['value']) => void
}) {
  if (condition.field === 'amount') {
    return (
      <Input
        id={id}
        type="number"
        min={0}
        value={condition.value}
        onChange={(value) => onChange(value === '' ? '' : Number(value))}
      />
    )
  }
  return (
    <Input
      id={id}
      value={conditionValueText(condition.value)}
      placeholder={condition.op === 'regex' ? '^GRAB\\*' : 'grabfood, ubereats'}
      onChange={onChange}
    />
  )
}

function conditionFieldLabel(intl: IntlShape, field: string, fallback: string): string {
  switch (field) {
    case 'account':
      return intl.formatMessage({ id: 'automations.txn.account', defaultMessage: 'Account' })
    case 'kind':
      return intl.formatMessage({ id: 'automations.txn.kind', defaultMessage: 'Kind' })
    case 'amount':
      return intl.formatMessage({ id: 'automations.txn.amount', defaultMessage: 'Amount' })
    case 'payee':
      return intl.formatMessage({ id: 'automations.txn.payee', defaultMessage: 'Payee' })
    case 'description':
      return intl.formatMessage({
        id: 'automations.txn.description',
        defaultMessage: 'Description',
      })
    case 'memo':
      return intl.formatMessage({ id: 'automations.txn.memo', defaultMessage: 'Memo' })
    default:
      return fallback
  }
}
function conditionKindLabel(intl: IntlShape, value: string, fallback: string): string {
  switch (value) {
    case 'expense':
      return intl.formatMessage({ id: 'automations.txn.expense', defaultMessage: 'Expense' })
    case 'income':
      return intl.formatMessage({ id: 'automations.txn.income', defaultMessage: 'Income' })
    case 'transfer':
      return intl.formatMessage({ id: 'automations.txn.transfer', defaultMessage: 'Transfer' })
    case 'investment':
      return intl.formatMessage({ id: 'automations.txn.investment', defaultMessage: 'Investment' })
    case 'investment_buy':
      return intl.formatMessage({ id: 'automations.txn.buy', defaultMessage: 'Investment: buy' })
    case 'investment_sale':
      return intl.formatMessage({ id: 'automations.txn.sale', defaultMessage: 'Investment: sale' })
    case 'adjustment':
      return intl.formatMessage({ id: 'automations.txn.adjustment', defaultMessage: 'Adjustment' })
    default:
      return fallback
  }
}
function conditionOpLabel(
  intl: IntlShape,
  value: string,
  fallback: string,
  several: boolean,
): string {
  if (several && value === 'is')
    return intl.formatMessage({ id: 'automations.condition.any', defaultMessage: 'is any of' })
  if (several && value === 'is_not')
    return intl.formatMessage({ id: 'automations.condition.none', defaultMessage: 'is none of' })
  switch (value) {
    case 'is':
      return intl.formatMessage({ id: 'automations.txn.is', defaultMessage: 'is' })
    case 'is_not':
      return intl.formatMessage({ id: 'automations.txn.isNot', defaultMessage: 'is not' })
    case 'over':
      return intl.formatMessage({ id: 'automations.txn.over', defaultMessage: 'over' })
    case 'under':
      return intl.formatMessage({ id: 'automations.txn.under', defaultMessage: 'under' })
    case 'contains':
      return intl.formatMessage({ id: 'automations.txn.contains', defaultMessage: 'contains' })
    case 'not_contains':
      return intl.formatMessage({
        id: 'automations.condition.notContains',
        defaultMessage: "doesn't contain",
      })
    case 'starts_with':
      return intl.formatMessage({ id: 'automations.txn.startsWith', defaultMessage: 'starts with' })
    case 'regex':
      return intl.formatMessage({ id: 'automations.txn.regex', defaultMessage: 'matches regex' })
    default:
      return fallback
  }
}
function conflictLabel(
  conflict: import('./txnConditionConflicts').ConditionConflict,
  intl: IntlShape,
): string {
  if (intl.locale.startsWith('en')) return conflict.message
  if (conflict.reason === 'amount')
    return intl.formatMessage(
      {
        id: 'automations.condition.amountConflict',
        defaultMessage:
          'An amount cannot be over {floor} and under {ceiling} at once, so this can never match.',
      },
      { floor: conflict.floor ?? 0, ceiling: conflict.ceiling ?? 0 },
    )
  const field = conditionFieldLabel(intl, conflict.field ?? '', conflict.field ?? '')
  return conflict.reason === 'one_value'
    ? intl.formatMessage(
        {
          id: 'automations.condition.oneValueConflict',
          defaultMessage:
            'A transaction has one {field}, so these cannot both be true — pick both in one condition instead.',
        },
        { field },
      )
    : intl.formatMessage(
        {
          id: 'automations.condition.excludedConflict',
          defaultMessage: '“Is” and “is not” rule out every {field} here, so this can never match.',
        },
        { field },
      )
}
