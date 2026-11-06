import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { FormattedMessage } from './FormattedMessage'
import { Mail, Tag, TriangleAlert } from 'lucide-react'
import { InfoPopover } from '../../ui'
import { PMSelect } from '../accounts/ds'
import type { CategoryChoices, Preview, PreviewCategory } from './runs'

// The Categories tab of the YNAB review: each YNAB category under its group, then two choices in
// their own columns. Category: one of the book's categories (pre-selected when one reads the same
// or close) or a new one. Envelope: only a NEW category has one to pick, a new envelope or one of
// the book's; a category of yours keeps the envelope it is in, since nothing is moved. Both make
// one choice for the server (``cat:…``, ``env:…`` or ``""``), re-checked by the review like an
// account's. Every row has the same shape — a chip or a dropdown in each column, in the app's own
// tag and envelope colours — and no line under it: anything worth checking is a warning beside
// the choice, read by hovering or tapping it.

// The choice shown for a category that matches several of the book's: no answer yet.
export const ASK = 'ask'
const NEW = 'new'

// A list longer than this is searched, not scrolled.
const SEARCH_FROM = 8

export interface CategoryProps {
  catLinks: Record<string, string>
  proposals: Record<string, string>
  checking: boolean
  onChoose: (ynabId: string, ref: string) => void
}

export function Categories({ preview: p, ...pick }: { preview: Preview } & CategoryProps) {
  const intl = useAppIntl()
  const groups = p.category_groups
  if (!groups || !p.category_choices)
    return <p className="ynr-empty">{<FormattedMessage id="imports.static.40e98edb" defaultMessage={"Review again to see the categories by name."} />}</p>
  if (groups.length === 0)
    return <p className="ynr-empty">{<FormattedMessage id="imports.static.fe0468a3" defaultMessage={"This plan has no categories of its own."} />}</p>
  const choices = p.category_choices
  return (
    <table className="imp-table ynr-table ynr-cats">
      <thead>
        <tr>
          <th>{<FormattedMessage id="imports.static.342f4a4c" defaultMessage={"YNAB category"} />}</th>
          <th>{<FormattedMessage id="imports.static.f27cc134" defaultMessage={"Category here"} />}</th>
          <th>{<FormattedMessage id="imports.static.73e31a3e" defaultMessage={"Envelope"} />}</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id}>
          <tr className="ynr-group">
            <th scope="rowgroup" colSpan={3}>
              {g.name}
              <span className="ynr-count">{g.categories.length}</span>
              <span className="ynr-groupnote">
                {g.group ? intl.formatMessage({ id: 'imports.category.groupMatch', defaultMessage: 'Matches your group {name}' }, { name: g.group.name }) : intl.formatMessage({ id: 'imports.category.newGroup', defaultMessage: 'A new group here' })}
              </span>
            </th>
          </tr>
          {g.categories.map((c) => (
            <CategoryRow key={c.id} category={c} choices={choices} preview={p} {...pick} />
          ))}
        </tbody>
      ))}
    </table>
  )
}

type RowProps = { category: PreviewCategory; choices: CategoryChoices; preview: Preview }

function CategoryRow({ category: c, choices, preview: p, ...pick }: RowProps & CategoryProps) {
  const intl = useAppIntl()
  if (c.link?.kind === 'linked')
    return (
      <tr>
        <td data-label={intl.formatMessage({ id: 'imports.category.ynab', defaultMessage: 'YNAB category' })}>{c.name}</td>
        <td data-label={intl.formatMessage({ id: 'imports.category.here', defaultMessage: 'Category here' })}>
          <Chip kind="tag" color={colorOf(choices, c.link.ref)} name={c.link.name} />
        </td>
        <td data-label={intl.formatMessage({ id: 'imports.category.envelope', defaultMessage: 'Envelope' })}>
          <EnvelopeOfYours category={c} choices={choices} ref_={c.link.ref} />
        </td>
      </tr>
    )
  // Another row's choice is not offered here again.
  const taken = new Set(
    (p.category_groups ?? [])
      .flatMap((g) => g.categories)
      .filter((x) => x.id !== c.id && x.link && x.link.kind !== 'linked')
      .map((x) => x.link!.ref),
  )
  const proposed = pick.proposals[c.id] === ASK ? '' : (pick.proposals[c.id] ?? '')
  const ref = pick.catLinks[c.id] ?? (c.ask ? ASK : (c.link?.ref ?? ''))
  const ours = ref.startsWith('cat:')
  // Two of the book's ENVELOPES read the same: the pick is asked for in the envelope column.
  const askEnv = ref === ASK && c.options.every((o) => o.ref.startsWith('env:'))
  const free = (r: string) => !taken.has(r) || r === proposed
  const choose = (r: string) => pick.onChoose(c.id, r)
  const toNew = () =>
    choose(proposed.startsWith('env:') && free(proposed) ? proposed : (c.offer ?? ''))
  const chosenEnv = choices.envelopes.find((e) => e.ref === ref)
  const why = categoryWarning(c, ref, askEnv, intl)
  return (
    <tr>
      <td data-label={intl.formatMessage({ id: 'imports.category.ynab', defaultMessage: 'YNAB category' })}>{c.name}</td>
      <td data-label={intl.formatMessage({ id: 'imports.category.here', defaultMessage: 'Category here' })}>
        <span className="ynr-cell">
          <PMSelect
            className="ynr-dest"
            ariaLabel={intl.formatMessage({ id: 'imports.category.forCategory', defaultMessage: 'Category here for {name}' }, { name: c.name })}
            value={ref === ASK && !askEnv ? ASK : ours ? ref : NEW}
            disabled={pick.checking}
            searchable={choices.categories.length + 1 > SEARCH_FROM}
            searchPlaceholder={intl.formatMessage({ id: 'imports.category.searchCategories', defaultMessage: 'Search your categories…' })}
            emptyText={intl.formatMessage({ id: 'imports.category.noCategories', defaultMessage: 'No category matches.' })}
            menuWidth={280}
            options={categoryOptions(c, choices, free, proposed, askEnv, intl)}
            onChange={(v) => (v === NEW ? toNew() : v !== ASK && choose(v))}
          />
          {why && <Warn text={why} name={c.name} />}
        </span>
      </td>
      <td data-label={intl.formatMessage({ id: 'imports.category.envelope', defaultMessage: 'Envelope' })}>
        {ref === ASK && !askEnv ? null : ours ? (
          <EnvelopeOfYours category={c} choices={choices} ref_={ref} />
        ) : (
          <span className="ynr-cell">
            <PMSelect
              className="ynr-dest"
              ariaLabel={intl.formatMessage({ id: 'imports.category.forEnvelope', defaultMessage: 'Envelope for {name}' }, { name: c.name })}
              value={ref}
              disabled={pick.checking}
              searchable={choices.envelopes.length + 1 > SEARCH_FROM}
              searchPlaceholder={intl.formatMessage({ id: 'imports.category.searchEnvelopes', defaultMessage: 'Search your envelopes…' })}
              emptyText={intl.formatMessage({ id: 'imports.category.noEnvelopes', defaultMessage: 'No envelope matches.' })}
              menuWidth={280}
              options={envelopeOptions(c, choices, free, proposed, askEnv, intl)}
              onChange={(v) => v !== ASK && choose(v)}
            />
            {askEnv ? (
              <Warn text={sameNames(c, intl)} name={c.name} />
            ) : (
              chosenEnv &&
              chosenEnv.holds > 0 && <Warn text={shared(chosenEnv.name, intl)} name={c.name} />
            )}
          </span>
        )}
      </td>
    </tr>
  )
}

/** The envelope a category of yours is already in — it stays there, so it is shown, not asked. */
function EnvelopeOfYours({
  category: c,
  choices,
  ref_,
}: {
  category: PreviewCategory
  choices: CategoryChoices
  ref_: string
}) {
  const intl = useAppIntl()
  const mine = choices.categories.find((x) => x.ref === ref_)
  const env = mine?.envelope
  if (!env)
    return c.assigned ? (
      <Chip kind="envelope" name={intl.formatMessage({ id: 'imports.category.newNamed', defaultMessage: '{name} (new)' }, { name: mine?.new_envelope ?? mine?.name ?? c.name })} />
    ) : (
      <Chip kind="envelope" name={intl.formatMessage({ id: 'imports.category.notBudgeted', defaultMessage: 'Not budgeted' })} faint />
    )
  return (
    <span className="ynr-cell">
      <Chip kind="envelope" color={env.color} name={env.name} />
      {env.shared && <Warn text={shared(env.name, intl)} name={c.name} />}
    </span>
  )
}

/** A new category or envelope has no colour yet, so its glyph is the faint one. */
function Glyph({ kind, color }: { kind: 'tag' | 'envelope'; color?: string }) {
  const Icon = kind === 'tag' ? Tag : Mail
  return (
    <Icon
      className="ynr-glyph"
      size={13}
      strokeWidth={2.2}
      color={color || 'var(--faint)'}
      aria-hidden="true"
    />
  )
}

function Chip(props: { kind: 'tag' | 'envelope'; name: string; color?: string; faint?: boolean }) {
  return (
    <span className={'ynr-chip' + (props.faint ? ' ynr-chip--faint' : '')}>
      <Glyph kind={props.kind} color={props.faint ? '' : props.color} />
      <span className="ynr-chip-nm">{props.name}</span>
    </span>
  )
}

/** Something worth checking about a choice, read by hovering or tapping the mark beside it. */
function Warn({ text, name }: { text: string; name: string }) {
  const intl = useAppIntl()
  return (
    <InfoPopover text={text} triggerClassName="ynr-warn" label={intl.formatMessage({ id: 'imports.category.check', defaultMessage: 'Check {name}' }, { name })}>
      <TriangleAlert size={14} strokeWidth={2.2} aria-hidden="true" />
    </InfoPopover>
  )
}

const shared = (envelope: string, intl: IntlShape) =>
  intl.formatMessage({ id: 'imports.category.shared', defaultMessage: "{name} holds other categories too, so its Assigned won't sync with YNAB. Their labels still do." }, { name: envelope })

const sameNames = (c: PreviewCategory, intl: IntlShape) =>
  intl.formatMessage({ id: 'imports.category.sameNames', defaultMessage: "{names} all read the same as YNAB's {name}. Pick the one it is." }, { names: listed(c.options.map(o => o.name), intl), name: c.name })

function listed(names: string[], intl: IntlShape) {
  return new Intl.ListFormat(intl.locale, { type: 'conjunction' }).format(names)
}

function categoryWarning(c: PreviewCategory, ref: string, askEnv: boolean, intl: IntlShape) {
  if (ref === ASK) return askEnv ? null : sameNames(c, intl)
  if (c.chosen || c.link?.ref !== ref) return null
  if (c.among) return intl.formatMessage({ id: 'imports.category.ambiguousSuggested', defaultMessage: "{names} all read the same as YNAB's {name}. This one is spelled most like it; change it if it's the wrong one." }, { names: listed(c.options.map(o => o.name), intl), name: c.name })
  if (c.close) return intl.formatMessage({ id: 'imports.category.closeSuggested', defaultMessage: "Picked because its name is close to YNAB's {name}. Change it if it's the wrong one." }, { name: c.name })
  return null
}

function colorOf(choices: CategoryChoices, ref: string) {
  return choices.categories.find((x) => x.ref === ref)?.color ?? ''
}

// The categories a row can go with: the suggested one and those it reads the same as first.
function categoryOptions(
  c: PreviewCategory,
  choices: CategoryChoices,
  free: (ref: string) => boolean,
  proposed: string,
  askEnv: boolean,
  intl: IntlShape,
) {
  const first = new Set([proposed, ...c.options.map((o) => o.ref)])
  const mine = choices.categories
    .filter((x) => free(x.ref))
    .sort((a, b) => Number(first.has(b.ref)) - Number(first.has(a.ref)))
  return [
    ...(c.ask && !askEnv ? [{ value: ASK, label: intl.formatMessage({ id: 'imports.category.choose', defaultMessage: 'Choose one…' }) }] : []),
    { value: NEW, label: intl.formatMessage({ id: 'imports.category.newCategory', defaultMessage: 'New category' }), icon: <Glyph kind="tag" /> },
    ...mine.map((x) => ({
      value: x.ref,
      label: x.name,
      icon: <Glyph kind="tag" color={x.color} />,
    })),
  ]
}

// The envelopes a new category can go in: the one of the same name first, then empty ones.
function envelopeOptions(
  c: PreviewCategory,
  choices: CategoryChoices,
  free: (ref: string) => boolean,
  proposed: string,
  askEnv: boolean,
  intl: IntlShape,
) {
  const asked = new Set(c.options.map((o) => o.ref))
  const rank = (e: CategoryChoices['envelopes'][number]) =>
    e.ref === proposed || e.ref === c.offer || asked.has(e.ref) ? 0 : e.holds === 0 ? 1 : 2
  const mine = choices.envelopes.filter((e) => free(e.ref)).sort((a, b) => rank(a) - rank(b))
  return [
    ...(askEnv ? [{ value: ASK, label: intl.formatMessage({ id: 'imports.category.choose', defaultMessage: 'Choose one…' }) }] : []),
    { value: '', label: intl.formatMessage({ id: 'imports.category.newNamed', defaultMessage: '{name} (new)' }, { name: c.new_name ?? c.name }), icon: <Glyph kind="envelope" /> },
    ...mine.map((e) => ({
      value: e.ref,
      label: e.name,
      icon: <Glyph kind="envelope" color={e.color} />,
    })),
  ]
}
