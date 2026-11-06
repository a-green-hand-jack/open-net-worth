// budgetLens/proportional/EnvelopeEditor.tsx — "Edit envelope" from the 50/30/20 table: name, group,
// monthly cap, colour, member categories, merge, delete. Ported from the Budget Onboarding (cards)
// design (owner, 2026-09-25). Structure is shared with Zero-Based — only the cap belongs to 50/30/20.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronDown, Tag } from 'lucide-react'
import { Button, Modal } from '../../../../ui'
import { getCurrencySymbol } from '../../../../../utils/format'
import { AddCategoryField } from '../../../accounts/pickers'
import { parseMoneyInput } from '../../planData'
import { Check } from '../MethodCard'
import { fmt } from './propMath'
import type { PropEnvelope } from './propApi'
import { useAppIntl } from '../../../../../i18n/useAppIntl'

const SWATCH = [
  '#3b86dd',
  '#34b08a',
  '#e0a032',
  '#d4537e',
  '#9a7fd0',
  '#22b8cf',
  '#e2554f',
  '#7c8595',
]

const XIc = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M3 3l6 6M9 3l-6 6" />
  </svg>
)

export interface EnvelopeDraft {
  label: string
  color: string
  group: string
  /** Member category ids; a `__new:<label>` entry is a category to create on save. */
  cats: string[]
  cap: number
  /** In the split — unticked, its spend counts against neither income nor savings. */
  counted: boolean
}

export function EnvelopeEditor({
  env,
  envs,
  allCats,
  catLabel,
  catColor,
  groups,
  cap,
  busy,
  error,
  onSave,
  onMerge,
  onDelete,
  onClose,
}: {
  env: PropEnvelope
  envs: PropEnvelope[]
  allCats: { id: string }[]
  catLabel: (k: string) => string
  catColor: (k: string) => string
  groups: string[]
  cap: { value: number; locked: boolean; from: string; last: number; avg: number }
  busy?: boolean
  error?: string | null
  onSave: (d: EnvelopeDraft) => void
  /** Opens Zero-Based's Merge envelope dialog (PropTable) — the target is picked there. */
  onMerge: () => void
  /** Opens Zero-Based's Delete envelope dialog (PropTable), which confirms and offers Undo. */
  onDelete: () => void
  onClose: () => void
}) {
  const { formatMessage } = useAppIntl()
  const [d, setD] = useState<EnvelopeDraft>(() => ({
    label: env.label,
    color: env.color,
    group: env.group || '',
    cats: [...env.category_ids],
    cap: cap.value || 0,
    counted: !env.excluded,
  }))
  // The cap as typed — a string until Save, so "12." or "83.3" can exist mid-keystroke (a
  // controlled number field can't hold them) and cents survive the round trip.
  const [capText, setCapText] = useState(cap.value ? String(cap.value) : '')
  const ownerOf = (k: string) => envs.find((e) => e.id !== env.id && e.category_ids.includes(k))
  // The server won't move an envelope that holds several categories — once removals are saved
  // first (propEdits.ts), what matters is how many of its CURRENT ones it keeps.
  const groupLocked = env.category_ids.filter((k) => d.cats.includes(k)).length > 1
  // Categories in no envelope first; one in another envelope names it — adding it moves it here.
  const options = allCats
    .filter((c) => !d.cats.includes(c.id))
    .map((c) => ({ c, owner: ownerOf(c.id) }))
    .sort((a, b) => Number(!!a.owner) - Number(!!b.owner))
    .map(({ c, owner }) => ({
      id: c.id,
      label: owner
        ? formatMessage(
            {
              id: 'plan.envelopeEditor.movesFrom',
              defaultMessage: '{category} — moves from {owner}',
            },
            { category: catLabel(c.id), owner: owner.label },
          )
        : catLabel(c.id),
      color: catColor(c.id),
      kind: 'expense' as const,
      group: owner
        ? formatMessage({
            id: 'plan.envelopeEditor.inAnother',
            defaultMessage: 'In another envelope',
          })
        : formatMessage({ id: 'plan.outside.noEnvelope', defaultMessage: 'Not in an envelope' }),
    }))
  const label = (k: string) => (k.startsWith('__new:') ? k.slice(6) : catLabel(k))
  return (
    <Modal
      open
      onClose={onClose}
      title={formatMessage({ id: 'plan.envelopeEditor.title', defaultMessage: 'Edit envelope' })}
    >
      <div className="pt-ed">
        {/* The cap first, set apart: it is the one thing here that belongs to 50/30/20 — the
            rest describes the envelope itself, shared with Zero-Based (owner, 2026-09-25). */}
        <div className="pt-ed-f pt-ed-capsec">
          <div className="pt-ed-caphead">
            <span>
              {formatMessage({ id: 'plan.envelopeEditor.cap', defaultMessage: 'Monthly cap' })}
            </span>
            <small className="pt-ed-hint">
              {cap.locked
                ? formatMessage({
                    id: 'plan.envelopeEditor.locked',
                    defaultMessage: 'Past months can’t be changed',
                  })
                : formatMessage(
                    { id: 'plan.envelopeEditor.from', defaultMessage: 'From {month} onward' },
                    { month: cap.from },
                  )}
            </small>
          </div>
          {cap.locked ? (
            <div className="pt-ed-ro">
              {d.cap
                ? fmt(d.cap)
                : formatMessage({ id: 'plan.envelopeEditor.noCap', defaultMessage: 'No cap' })}
            </div>
          ) : (
            <>
              <span className="pt-ed-in pt-ed-cap">
                <b>{getCurrencySymbol()}</b>
                <input
                  value={capText}
                  placeholder={formatMessage({
                    id: 'plan.envelopeEditor.noCap',
                    defaultMessage: 'No cap',
                  })}
                  inputMode="decimal"
                  aria-label={formatMessage({
                    id: 'plan.envelopeEditor.cap',
                    defaultMessage: 'Monthly cap',
                  })}
                  onChange={(e) => setCapText(e.target.value.replace(/[^0-9.]/g, ''))}
                />
              </span>
              {(cap.last > 0 || cap.avg > 0) && (
                <div className="pt-ed-capfill">
                  {cap.last > 0 && (
                    <button
                      type="button"
                      className="pt-ed-capchip"
                      onClick={() => setCapText(String(Math.round(cap.last)))}
                    >
                      {formatMessage({
                        id: 'plan.envelopeEditor.lastMonth',
                        defaultMessage: 'Last month',
                      })}{' '}
                      <b>{fmt(cap.last)}</b>
                      <span className="pt-ed-capuse">
                        {formatMessage({ id: 'plan.envelopeEditor.use', defaultMessage: 'Use' })}
                      </span>
                    </button>
                  )}
                  {cap.avg > 0 && (
                    <button
                      type="button"
                      className="pt-ed-capchip"
                      onClick={() => setCapText(String(Math.round(cap.avg)))}
                    >
                      {formatMessage({
                        id: 'plan.envelopeEditor.average',
                        defaultMessage: '3-month average',
                      })}{' '}
                      <b>{fmt(cap.avg)}</b>
                      <span className="pt-ed-capuse">
                        {formatMessage({ id: 'plan.envelopeEditor.use', defaultMessage: 'Use' })}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {/* 50/30/20's own, beside the cap: one envelope out of the split — a pass-through you're
            paid back for, a one-off paid from savings — while it stays in its group. */}
        <div className="pt-ed-count">
          <button
            type="button"
            role="checkbox"
            aria-checked={d.counted}
            aria-label={formatMessage({
              id: 'plan.envelopeEditor.count',
              defaultMessage: 'Count in the split',
            })}
            className={'bo-check' + (d.counted ? ' on' : '')}
            onClick={() => setD({ ...d, counted: !d.counted })}
          >
            {d.counted && <Check size={11} />}
          </button>
          <span>
            <b>
              {formatMessage({
                id: 'plan.envelopeEditor.count',
                defaultMessage: 'Count in the split',
              })}
            </b>
            <small className="pt-ed-hint">
              {formatMessage({
                id: 'plan.envelopeEditor.countHint',
                defaultMessage:
                  'Untick for money you’re paid back for, or a one-off paid from savings — its spending then won’t count against your income or savings.',
              })}
            </small>
          </span>
        </div>
        <div className="pt-ed-pair">
          <label className="pt-ed-f">
            <span>{formatMessage({ id: 'plan.envelopeEditor.name', defaultMessage: 'Name' })}</span>
            <input
              className="pt-ed-in"
              value={d.label}
              onChange={(e) => setD({ ...d, label: e.target.value })}
            />
          </label>
          {/* Picked from the book's groups, never typed (owner, 2026-09-26: "must be shown as a
              drop down") — the one way to move an envelope on a phone; a desktop also drags. */}
          <label className="pt-ed-f">
            <span>
              {formatMessage({ id: 'plan.envelopeEditor.group', defaultMessage: 'Group' })}
            </span>
            <span className="pt-ed-selwrap">
              <select
                className="pt-ed-in"
                aria-label={formatMessage({
                  id: 'plan.envelopeEditor.group',
                  defaultMessage: 'Group',
                })}
                value={groupLocked ? env.group || d.group : d.group}
                disabled={groupLocked}
                aria-describedby={groupLocked ? 'pt-ed-grouplock' : undefined}
                onChange={(e) => setD({ ...d, group: e.target.value })}
              >
                {!d.group && (
                  <option value="">
                    {formatMessage({
                      id: 'plan.envelopeEditor.pickGroup',
                      defaultMessage: 'Pick a group',
                    })}
                  </option>
                )}
                {(!env.group || groups.includes(env.group) ? groups : [env.group, ...groups]).map(
                  (g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown size={15} strokeWidth={2} aria-hidden="true" />
            </span>
            {groupLocked && (
              <small id="pt-ed-grouplock" className="pt-ed-hint">
                {formatMessage({
                  id: 'plan.envelopeEditor.groupLocked',
                  defaultMessage: 'An envelope with several categories stays in its group',
                })}
              </small>
            )}
          </label>
        </div>
        <div className="pt-ed-f">
          <span>
            {formatMessage({ id: 'plan.envelopeEditor.colour', defaultMessage: 'Colour' })}
          </span>
          <div className="pt-sw">
            {[...SWATCH, ...(SWATCH.includes(d.color) ? [] : [d.color])].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={formatMessage(
                  { id: 'plan.envelopeEditor.colourValue', defaultMessage: 'Colour {colour}' },
                  { colour: c },
                )}
                aria-pressed={d.color === c}
                className={d.color === c ? 'on' : ''}
                style={{ background: c }}
                onClick={() => setD({ ...d, color: c })}
              >
                {d.color === c && <Check size={12} />}
              </button>
            ))}
            <label
              className="pt-sw-custom"
              title={formatMessage({
                id: 'plan.envelopeEditor.customColour',
                defaultMessage: 'Custom colour',
              })}
            >
              <input
                type="color"
                value={d.color}
                aria-label={formatMessage({
                  id: 'plan.envelopeEditor.customColour',
                  defaultMessage: 'Custom colour',
                })}
                onChange={(e) => setD({ ...d, color: e.target.value })}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 2.5v7M2.5 6h7" />
              </svg>
            </label>
          </div>
        </div>
        <div className="pt-ed-f">
          <span>
            {formatMessage({ id: 'plan.envelopeEditor.categories', defaultMessage: 'Categories' })}
          </span>
          <div className="pt-ed-cats">
            {d.cats.map((k) => (
              <span
                key={k}
                className="pt-ed-chip pt-catpill"
                style={
                  { '--cc': k.startsWith('__new:') ? '#7c8595' : catColor(k) } as CSSProperties
                }
              >
                <Tag size={12} strokeWidth={2.2} aria-hidden="true" />
                {label(k)}
                <button
                  type="button"
                  aria-label={formatMessage(
                    { id: 'plan.envelopeEditor.remove', defaultMessage: 'Remove {category}' },
                    { category: label(k) },
                  )}
                  onClick={() => setD({ ...d, cats: d.cats.filter((x) => x !== k) })}
                >
                  <XIc />
                </button>
              </span>
            ))}
            {!d.cats.length && (
              <span className="pt-ed-none">
                {formatMessage({
                  id: 'plan.envelopeEditor.noCategories',
                  defaultMessage: 'No categories — spending won’t land here until you add one.',
                })}
              </span>
            )}
          </div>
          {/* The transaction category picker: search, pick, or type a new name to create one
              (created on Save, as an expense category). */}
          <div className="pt-ed-add">
            <AddCategoryField
              value=""
              options={options}
              placeholder={formatMessage({
                id: 'plan.envelopeEditor.addCategory',
                defaultMessage: 'Add a category…',
              })}
              advance={() => {}}
              createNeedsName
              onChange={(k) => k && setD({ ...d, cats: [...d.cats, k] })}
              onCreate={(name) => {
                const l = name.trim()
                if (l && !d.cats.includes('__new:' + l))
                  setD({ ...d, cats: [...d.cats, '__new:' + l] })
              }}
            />
          </div>
        </div>
        <div className="pt-ed-f pt-ed-merge">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || envs.length < 2}
            onClick={onMerge}
          >
            {formatMessage({
              id: 'plan.envelopeEditor.merge',
              defaultMessage: 'Merge into another envelope…',
            })}
          </Button>
        </div>
        {error && (
          <p className="pt-ob-err" role="alert">
            {error}
          </p>
        )}
        <div className="pt-ed-foot">
          <button type="button" className="pt-ed-dellink" onClick={onDelete}>
            {formatMessage({
              id: 'plan.envelopeEditor.delete',
              defaultMessage: 'Delete envelope…',
            })}
          </button>
          <span className="bo-spacer" />
          <Button variant="secondary" size="sm" onClick={onClose}>
            {formatMessage({ id: 'plan.envelopeEditor.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            disabled={!d.label.trim() || !d.group.trim()}
            onClick={() => {
              const next = groupLocked ? { ...d, group: env.group || d.group } : d
              onSave(cap.locked ? next : { ...next, cap: parseMoneyInput(capText) })
            }}
          >
            {d.group.trim()
              ? formatMessage({ id: 'plan.envelopeEditor.save', defaultMessage: 'Save' })
              : formatMessage({
                  id: 'plan.envelopeEditor.pickGroup',
                  defaultMessage: 'Pick a group',
                })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
