import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { ProposedChange } from '../../../types/chat'
import { budgetOpLabel, budgetOperationHeaderLabel, budgetOperationOf, humanizeType, permissionArguments, stagedTitle, txnHeaderLabel } from './cardTypes'
import { localizedAction } from '../toolActivity/localizedDisplay'

const titles = defineMessages({
  assign: { id: 'chat.approval.title.assign', defaultMessage: 'Assign budget' },
  move_money: { id: 'chat.approval.title.move_money', defaultMessage: 'Move money' },
  group_create: { id: 'chat.approval.title.group_create', defaultMessage: 'Create group' },
  group_rename: { id: 'chat.approval.title.group_rename', defaultMessage: 'Rename group' },
  group_reorder: { id: 'chat.approval.title.group_reorder', defaultMessage: 'Reorder groups' },
  group_delete: { id: 'chat.approval.title.group_delete', defaultMessage: 'Delete group' },
  move_category: { id: 'chat.approval.title.move_category', defaultMessage: 'Move category' },
  reorder_categories: { id: 'chat.approval.title.reorder_categories', defaultMessage: 'Reorder categories' },
  txn_create: { id: 'chat.approval.title.txn_create', defaultMessage: 'Book transaction' },
  txn_update: { id: 'chat.approval.title.txn_update', defaultMessage: 'Update transaction' },
  txn_bulk: { id: 'chat.approval.title.txn_bulk', defaultMessage: 'Import transactions' },
})
const targetActions = defineMessages({
  set: { id: 'chat.budget.actionSet', defaultMessage: 'Set target' },
  snooze: { id: 'chat.budget.actionSnooze', defaultMessage: 'Snooze target' },
  unsnooze: { id: 'chat.budget.actionUnsnooze', defaultMessage: 'Unsnooze target' },
  clear: { id: 'chat.budget.actionClear', defaultMessage: 'Clear target' },
})
const batchTitles = defineMessages({
  update_batch: { id: 'chat.approval.batch.update', defaultMessage: 'Update positions' },
  add_batch: { id: 'chat.approval.batch.add', defaultMessage: 'Add positions' },
  remove_batch: { id: 'chat.approval.batch.remove', defaultMessage: 'Remove positions' },
  lot_acquire_batch: { id: 'chat.approval.batch.acquire', defaultMessage: 'Record acquisitions' },
  lot_update_batch: { id: 'chat.approval.batch.correct', defaultMessage: 'Correct lots' },
  lot_delete_batch: { id: 'chat.approval.batch.delete', defaultMessage: 'Delete lots' },
  lot_dispose_batch: { id: 'chat.approval.batch.dispose', defaultMessage: 'Record disposals' },
  lot_dispose_undo_batch: { id: 'chat.approval.batch.undo', defaultMessage: 'Reverse disposals' },
  set_target_batch: { id: 'chat.approval.batch.targets', defaultMessage: 'Set target (batch)' },
})

export function targetActionLabel(code: unknown, intl: ReturnType<typeof useAppIntl>): string | null {
  return typeof code === 'string' && Object.hasOwn(targetActions, code) ? intl.formatMessage(targetActions[code as keyof typeof targetActions] as MessageDescriptor) : null
}

export function ChangeTitle({ change, kind }: { change: ProposedChange; kind: 'budget' | 'transaction' }) {
  const intl = useAppIntl()
  if (change.type === 'set_target') {
    const op = (change.display as { op_id?: unknown } | undefined)?.op_id
    return <>{targetActionLabel(op, intl) || budgetOpLabel(change)}</>
  }
  const title = Object.hasOwn(titles, change.type) ? titles[change.type as keyof typeof titles] as MessageDescriptor : undefined
  return <>{title ? intl.formatMessage(title) : kind === 'budget' ? budgetOpLabel(change) : txnHeaderLabel(change)}</>
}

export function BudgetOperationTitle({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const args = permissionArguments(change)
  if (change.grant_tool === 'set_home_budget_engine') {
    const engine = args.engine_id === 'proportional' ? '50/30/20' : args.engine_id === 'zero_based' ? 'Zero-Based' : null
    if (!engine && args.engine_id) return <>{budgetOperationHeaderLabel(change)}</>
    return <>{engine ? intl.formatMessage({ id: 'chat.budget.switchTo', defaultMessage: 'Switch home budget lens to {engine}' }, { engine }) : intl.formatMessage({ id: 'chat.budget.switch', defaultMessage: 'Switch home budget lens' })}</>
  }
  const operation = budgetOperationOf(args)
  if (!operation) return <>{budgetOperationHeaderLabel(change)}</>
  const text = localizedAction({ label: '', verb: 'update', noun: '', owner_id: 'core', owner_name: '', detail: '', localization: { tool: change.grant_tool || '', operation, engine: typeof args.engine_id === 'string' ? args.engine_id : undefined, detail: '', detail_mode: 'none' } }, intl)
  return <>{text || budgetOperationHeaderLabel(change)}</>
}

export function GenericTitle({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  if (Object.hasOwn(batchTitles, change.type)) return <>{intl.formatMessage(batchTitles[change.type as keyof typeof batchTitles] as MessageDescriptor)}</>
  const tool = change.grant_tool || ''
  const translated = tool && localizedAction({ label: '', verb: '', noun: '', owner_id: 'core', owner_name: '', detail: '', localization: { tool, detail: '', detail_mode: 'none' } }, intl)
  return <>{translated || stagedTitle(change) || humanizeType(change.type === 'tool_permission' && tool ? tool : change.type)}</>
}
