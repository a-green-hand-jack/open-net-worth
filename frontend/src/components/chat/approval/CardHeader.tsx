import { BudgetOperationTitle, ChangeTitle, GenericTitle } from './ChangeTitles'
import { FormattedMessage } from './FormattedMessage'
import type { ProposedChange } from '../../../types/chat'
import {
  HANDLED_TYPES,
  isBudgetChange,
  isBudgetOperationGrant,
  isDestructive,
  isTxnChange,
} from './cardTypes'

/** The card's title line — what kind of write, and on what — shared by the live card and the
 * read-only diff so the two can never name a change differently. It names the action and its
 * subject ONCE; a body's lead adds only what this can't say (docs/APPROVAL_CARDS.md). A
 * destructive write is toned here, so its lead doesn't need a second red line. */
export function CardHeader({ change }: { change: ProposedChange }) {
  const d = change.display || {}
  return (
    <div
      className={`change-preview-header${isDestructive(change) ? ' change-preview-header--danger' : ''}`}
    >
      {change.type === 'update' && <FormattedMessage id="chat.approval.title.update_position" defaultMessage="Update position" />}
      {change.type === 'add' && <FormattedMessage id="chat.approval.title.add_position" defaultMessage="Add position" />}
      {change.type === 'remove' && <FormattedMessage id="chat.approval.title.remove_position" defaultMessage="Remove position" />}
      {change.type === 'skill_create' && <FormattedMessage id="chat.approval.title.create_skill" defaultMessage="Create skill" />}
      {change.type === 'skill_update' && <FormattedMessage id="chat.approval.title.update_skill" defaultMessage="Update skill" />}
      {change.type === 'skill_delete' && <FormattedMessage id="chat.approval.title.delete_skill" defaultMessage="Delete skill" />}
      {change.type === 'lot_acquire' && <FormattedMessage id="chat.approval.title.record_acquisition" defaultMessage="Record acquisition" />}
      {change.type === 'lot_delete' && <FormattedMessage id="chat.approval.title.delete_lot" defaultMessage="Delete lot" />}
      {change.type === 'lot_dispose' &&
        (d.is_taxable !== false
          ? <FormattedMessage id="chat.approval.title.record_sale" defaultMessage="Record sale" />
          : d.transfer_to_account_name || d.transfer_to_account_id
            ? <FormattedMessage id="chat.approval.title.record_transfer" defaultMessage="Record transfer" />
            : <FormattedMessage id="chat.approval.title.record_transfer_out" defaultMessage="Record transfer-out" />)}
      {change.type === 'record_income' && (d.is_drp ? <FormattedMessage id="chat.approval.title.record_drp_reinvestment" defaultMessage="Record DRP reinvestment" /> : <FormattedMessage id="chat.approval.title.record_income" defaultMessage="Record income" />)}
      {change.type === 'agent_create' && <FormattedMessage id="chat.approval.title.create_agent" defaultMessage="Create agent" />}
      {change.type === 'agent_update' && <FormattedMessage id="chat.approval.title.update_agent" defaultMessage="Update agent" />}
      {change.type === 'code_run' && <FormattedMessage id="chat.approval.title.run_a_script" defaultMessage="Run a script" />}
      {change.type === 'code_skill_create' && <FormattedMessage id="chat.approval.title.save_as_script_skill" defaultMessage="Save as script-skill" />}
      {change.type === 'external_mcp_call' && (
        <>
          <span className="change-preview-tool">
            {String(d.name || change.tool || 'Tool call')}
          </span>
          {(d.server || change.server_id) && (
            <span className="change-preview-label">{String(d.server || change.server_id)}</span>
          )}
        </>
      )}
      {isBudgetChange(change) && <ChangeTitle change={change} kind="budget" />}
      {isBudgetOperationGrant(change) && <BudgetOperationTitle change={change} />}
      {isTxnChange(change) && <ChangeTitle change={change} kind="transaction" />}
      {!HANDLED_TYPES.includes(change.type) &&
        !isBudgetOperationGrant(change) &&
        <GenericTitle change={change} />}
      {(d.symbol || d.name) && !isBudgetChange(change) && change.type !== 'external_mcp_call' && (
        <span className="change-preview-label">
          {d.symbol || d.name}
          {d.venue && ` • ${d.venue}`}
        </span>
      )}
    </div>
  )
}
