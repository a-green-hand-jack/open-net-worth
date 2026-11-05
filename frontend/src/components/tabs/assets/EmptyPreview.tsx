// The empty Assets page is the populated page with nothing in it yet: the same grid and card
// shapes, each card an empty slot that adds the thing it names. Account classes come first,
// as they do once filled, because their money arrives from Accounts rather than from here.
import type { AssetCategory } from '../../../types/assets'
import { Icons } from './icons'
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { assetCategoryLabel } from './categoryLabels'

interface Slot {
  key: string
  icon: string
  name: string
  hint: string
  color: string
  /** Accessible name; the visible label is just "Add". */
  label: string
  onPick: () => void
}

const ACCOUNT_SLOTS = [
  {
    key: 'cash',
    type: 'cash',
    color: 'var(--cat-cash)',
  },
  {
    key: 'investments',
    type: 'investment',
    color: 'var(--cat-invest)',
  },
  {
    key: 'retirement',
    type: 'retirement',
    color: 'var(--cat-retirement)',
  },
  {
    key: 'card',
    type: 'credit',
    color: 'var(--contingent)',
  },
]

const ASSET_HINTS = defineMessages({
  property: { id: 'assets.hint.property', defaultMessage: 'Home, apartment, land' },
  vehicle: { id: 'assets.hint.vehicle', defaultMessage: 'Car, motorbike, boat' },
  watch: { id: 'assets.hint.watch', defaultMessage: 'Watches, rings, jewellery' },
  art: { id: 'assets.hint.art', defaultMessage: 'Paintings, wine, collectibles' },
  metal: { id: 'assets.hint.metal', defaultMessage: 'Gold and silver bars, coins' },
  policy: { id: 'assets.hint.policy', defaultMessage: 'Whole life, endowment, ILP' },
})

const ACCOUNT_MESSAGES = defineMessages({
  cashName: { id: 'assets.slot.cash', defaultMessage: 'Cash & Savings' },
  cashHint: { id: 'assets.slot.cashHint', defaultMessage: 'Bank accounts, fixed deposits' },
  cashLabel: { id: 'assets.slot.cashLabel', defaultMessage: 'Add bank account' },
  investmentsName: { id: 'assets.slot.investments', defaultMessage: 'Investments' },
  investmentsHint: {
    id: 'assets.slot.investmentsHint',
    defaultMessage: 'Brokerage, funds, crypto',
  },
  investmentsLabel: { id: 'assets.slot.investmentsLabel', defaultMessage: 'Add brokerage account' },
  retirementName: { id: 'assets.slot.retirement', defaultMessage: 'Retirement' },
  retirementHint: { id: 'assets.slot.retirementHint', defaultMessage: 'CPF, 401(k), pension' },
  retirementLabel: { id: 'assets.slot.retirementLabel', defaultMessage: 'Add retirement account' },
  cardName: { id: 'assets.slot.card', defaultMessage: 'Credit cards' },
  cardHint: { id: 'assets.slot.cardHint', defaultMessage: 'What you owe' },
  cardLabel: { id: 'assets.slot.cardLabel', defaultMessage: 'Add credit card' },
})

// The tour lights the first slot of each kind.
const TOUR_TARGETS: Record<string, string> = {
  cash: 'assets-accounts',
  property: 'assets-things',
}

interface EmptyPreviewProps {
  cats: AssetCategory[]
  onAddAccount: (accountType: string) => void
  /** Null opens the wizard on its first step, every kind on offer. */
  onAddAsset: (category: string | null) => void
  /** Off for the populated page's "Add more", where accounts already have their own cards. */
  accounts?: boolean
}

export function EmptyPreview({
  cats,
  onAddAccount,
  onAddAsset,
  accounts = true,
}: EmptyPreviewProps) {
  const intl = useAppIntl()
  const slots: Slot[] = [
    ...(accounts ? ACCOUNT_SLOTS : []).map((a) => ({
      ...a,
      name: intl.formatMessage(ACCOUNT_MESSAGES[`${a.key}Name` as keyof typeof ACCOUNT_MESSAGES]),
      hint: intl.formatMessage(ACCOUNT_MESSAGES[`${a.key}Hint` as keyof typeof ACCOUNT_MESSAGES]),
      label: intl.formatMessage(ACCOUNT_MESSAGES[`${a.key}Label` as keyof typeof ACCOUNT_MESSAGES]),
      icon: a.key,
      onPick: () => onAddAccount(a.type),
    })),
    ...cats
      .filter((c) => Object.hasOwn(ASSET_HINTS, c.key))
      .map((c) => ({
        key: c.key,
        icon: c.key,
        name: assetCategoryLabel(intl, c),
        hint: intl.formatMessage(ASSET_HINTS[c.key as keyof typeof ASSET_HINTS]),
        color: c.color,
        label: intl.formatMessage(
          { id: 'assets.addCategory', defaultMessage: 'Add {category}' },
          {
            category: c.custom
              ? c.label
              : assetCategoryLabel(intl, c).toLocaleLowerCase(intl.locale),
          },
        ),
        onPick: () => onAddAsset(c.key),
      })),
    // The tiles list the common kinds; this one says the list isn't the limit. It opens the
    // wizard at its first step, where every kind (and making your own) is on offer.
    {
      key: 'other',
      icon: 'other',
      name: intl.formatMessage({ id: 'assets.other', defaultMessage: 'Other' }),
      hint: intl.formatMessage({ id: 'assets.custom', defaultMessage: 'Custom' }),
      color: 'var(--faint)',
      label: intl.formatMessage({
        id: 'assets.addOther',
        defaultMessage: 'Add another kind of asset',
      }),
      onPick: () => onAddAsset(null),
    },
  ]
  return (
    <div className="as-tiles">
      {slots.map((s) => (
        <button
          key={s.key}
          type="button"
          className="as-tile"
          aria-label={s.label}
          data-tour={TOUR_TARGETS[s.key]}
          onClick={s.onPick}
        >
          <span
            className="as-tile-thumb"
            style={{
              background: `color-mix(in srgb, ${s.color} 15%, var(--bg-2))`,
              borderColor: `color-mix(in srgb, ${s.color} 32%, var(--line))`,
              color: s.color,
            }}
          >
            {(Icons[s.icon] ?? Icons.other)!({ width: 18, height: 18 })}
          </span>
          <span className="as-tile-id">
            <span className="as-tile-nm">{s.name}</span>
            <span className="as-tile-ex">{s.hint}</span>
          </span>
          <span className="as-tile-plus" aria-hidden="true">
            {Icons.plus!({ width: 15, height: 15 })}
          </span>
        </button>
      ))}
    </div>
  )
}
