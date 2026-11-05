// budgetLens/proportional/PropDialogs.tsx — the confirm steps of the 50/30/20 table's envelope
// writes, and the New envelope form. Every one is Zero-Based's OWN dialog (budgetEnvelopeOps.tsx)
// — envelopes are shared between the two methods — told what 50/30/20 keeps in place of
// Zero-Based's assigned money: a cap and a share (owner, 2026-09-25).
import { useState } from 'react'
import { useAppIntl } from '../../../../../i18n/useAppIntl'
import { BudgetVerbRequestError } from '../api'
import {
  DeleteEnvelopeModal,
  MergeEnvelopeModal,
  NewEnvelopeModal,
  RemoveCategoryModal,
} from '../../budgetEnvelopeOps'
import type { EnvelopeGroupRef } from '../../budgetEnvelopeOps'
import type { CategoryMeta } from '../../../../../hooks/useBudget'
import {
  addCategory,
  createEnvelope,
  deleteEnvelope,
  EnvelopeRequestError,
  removeCategory,
  undoDeleteEnvelope,
} from './envelopeOps'
import { mergeEnvelopes } from './propEdits'
import { fmt } from './propMath'
import type { PropEnvelope, PropMonth } from './propApi'

export type PropDialog =
  | { kind: 'delete'; env: PropEnvelope }
  | { kind: 'merge'; env: PropEnvelope }
  | { kind: 'remove'; env: PropEnvelope; categoryId: string }
  /** From a group's + (or its ⋮ → Add envelope) it lands in that group; else in Others. */
  | { kind: 'new'; groupId?: string; groupName?: string }

const ref = (e: PropEnvelope) => ({ envelopeId: e.id, label: e.label, categoryIds: e.category_ids })

export function PropDialogs({
  dialog,
  m,
  ym,
  monthLabel,
  capsLocked,
  categories,
  hiddenKeys,
  catLabel,
  toast,
  captureUndo,
  onClose,
}: {
  dialog: PropDialog | null
  m: PropMonth
  ym: string
  /** "Sep 2026" — when a merged cap starts counting. */
  monthLabel: string
  capsLocked: boolean
  categories: CategoryMeta[]
  hiddenKeys: Set<string>
  catLabel: (k: string) => string
  toast: (msg: string) => void
  captureUndo: (label: string, inverse: () => Promise<void>) => void
  onClose: () => void
}) {
  const { formatMessage } = useAppIntl()
  const [busy, setBusy] = useState(false)
  if (!dialog) return null
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      onClose()
    } catch (e) {
      toast(
        e instanceof BudgetVerbRequestError
          ? formatMessage(
              { id: 'plan.model.requestFailed', defaultMessage: 'Request failed ({status})' },
              { status: e.status },
            )
          : e instanceof EnvelopeRequestError
            ? formatMessage(
                { id: 'plan.model.requestFailed', defaultMessage: 'Request failed ({status})' },
                { status: e.status },
              )
            : e instanceof Error
              ? e.message
              : formatMessage({
                  id: 'plan.somethingWrong',
                  defaultMessage: 'Something went wrong — try again.',
                }),
      )
    } finally {
      setBusy(false)
    }
  }

  if (dialog.kind === 'new')
    return (
      <NewEnvelopeModal
        groupName={dialog.groupName}
        allGroups={[{ cats: m.envelopes.map(ref) }]}
        categories={categories}
        hiddenKeys={hiddenKeys}
        rowCount={m.envelopes.length}
        busy={busy}
        onCancel={onClose}
        onConfirm={(name, color, categoryIds) =>
          void run(async () => {
            const id = await createEnvelope(name, color, dialog.groupId)
            for (const c of categoryIds) await addCategory(id, c)
            toast(
              formatMessage(
                { id: 'plan.envelopeInGroup', defaultMessage: '“{name}” is in {group}' },
                {
                  name,
                  group:
                    dialog.groupName ??
                    formatMessage({ id: 'plan.others', defaultMessage: 'Others' }),
                },
              ),
            )
          })
        }
      />
    )

  const { env } = dialog
  if (dialog.kind === 'delete')
    return (
      <DeleteEnvelopeModal
        envelopeId={env.id}
        month={ym}
        envelopeName={env.label}
        categoryLabels={env.category_ids.map(catLabel)}
        notes={
          env.cap
            ? [
                formatMessage(
                  {
                    id: 'plan.propDeleteCap',
                    defaultMessage: 'Its {amount} cap stops counting toward {group}',
                  },
                  {
                    amount: fmt(env.cap),
                    group:
                      env.group ||
                      formatMessage({ id: 'plan.itsGroup', defaultMessage: 'its group' }),
                  },
                ),
              ]
            : []
        }
        busy={busy}
        onCancel={onClose}
        onConfirm={() =>
          void run(async () => {
            const { undoToken, deltaRta } = await deleteEnvelope(env.id, ym)
            toast(
              deltaRta > 0.005
                ? formatMessage(
                    {
                      id: 'plan.propEnvelopeDeletedReturned',
                      defaultMessage:
                        'Envelope “{name}” deleted — {amount} returned to Ready to Assign',
                    },
                    { name: env.label, amount: fmt(deltaRta) },
                  )
                : formatMessage(
                    { id: 'plan.propEnvelopeDeleted', defaultMessage: 'Envelope “{name}” deleted' },
                    { name: env.label },
                  ),
            )
            captureUndo(
              formatMessage({ id: 'plan.envelopeDeleted', defaultMessage: 'Envelope deleted' }),
              () => undoDeleteEnvelope(undoToken),
            )
          })
        }
      />
    )

  if (dialog.kind === 'merge') {
    // The merge target is picked from the book's own groups — the same ones Zero-Based shows.
    const groups: EnvelopeGroupRef[] = m.groups.map((g) => ({
      name: g.name,
      cats: m.envelopes.filter((e) => e.group_id === g.id).map(ref),
    }))
    return (
      <MergeEnvelopeModal
        source={ref(env)}
        allGroups={groups}
        moneyLine={(dest) =>
          env.cap && !capsLocked ? (
            <>
              {formatMessage(
                {
                  id: 'plan.propMergeCap',
                  defaultMessage:
                    'Its <b>{amount}</b> cap adds to {destination}’s, from {month} on',
                },
                {
                  amount: fmt(env.cap),
                  destination: dest,
                  month: monthLabel,
                  b: (chunks) => <b>{chunks}</b>,
                },
              )}
            </>
          ) : (
            <>
              {formatMessage(
                { id: 'plan.propMergeKeepsCap', defaultMessage: '{destination} keeps its own cap' },
                { destination: dest },
              )}
            </>
          )
        }
        onCancel={onClose}
        onConfirm={(targetId, targetName) => {
          const to = m.envelopes.find((e) => e.id === targetId)
          if (!to) return
          void run(async () => {
            await mergeEnvelopes(env, to, { ym, capsLocked })
            toast(
              formatMessage(
                { id: 'plan.envelopeMerged', defaultMessage: 'Merged “{source}” into “{target}”' },
                { source: env.label, target: targetName },
              ),
            )
          })
        }}
      />
    )
  }

  const label = catLabel(dialog.categoryId)
  return (
    <RemoveCategoryModal
      envelopeName={env.label}
      categoryLabel={label}
      sole={env.category_ids.length === 1}
      whereLine={
        <>
          {formatMessage(
            {
              id: 'plan.propUnlinkedSpending',
              defaultMessage:
                '{name}’s spending will then be in no envelope. It reduces your savings until you put it in one',
            },
            { name: label },
          )}
        </>
      }
      keepsLine={
        env.cap
          ? formatMessage(
              { id: 'plan.propKeepsCap', defaultMessage: '{name} keeps its {amount} cap' },
              { name: env.label, amount: fmt(env.cap) },
            )
          : formatMessage(
              { id: 'plan.propStays', defaultMessage: '{name} stays put' },
              { name: env.label },
            )
      }
      onCancel={onClose}
      onConfirm={() =>
        void run(async () => {
          await removeCategory(env.id, dialog.categoryId)
          toast(
            formatMessage(
              {
                id: 'plan.categoryRemovedFrom',
                defaultMessage: '{category} removed from {envelope}',
              },
              { category: label, envelope: env.label },
            ),
          )
        })
      }
    />
  )
}
