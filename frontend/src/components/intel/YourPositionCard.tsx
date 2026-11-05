import { getNumberLocale } from '../../utils/format'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useNavigate } from '@tanstack/react-router'
import { Panel, Stack, Text } from '../ui'
import { ArrowRight } from '../../ui/icons'
import { entityRefProps } from '../../utils/mentionable'
import { buildCtxFields } from '../../lucius/ctxFields'
import { filterByDescriptor } from '../../lucius/entityRegistry'
import { fBase, fDate, fPct, plClass, getCurrencySymbol, priceDigits } from '../../utils/format'
import type { AssetPosition } from '../../types/assetDetail'
import type { IncomeSummary } from '../../types/portfolio'

interface Props {
  position: AssetPosition
  /** The instrument's ticker/symbol — the position block itself carries none. */
  symbol?: string
  /** Position-scoped dividend/interest/distribution income — fetched once by AssetDetailView
   *  and shared with PositionSubtab. Null while loading, on error, or for a merged
   *  multi-account holding (no single position_id to scope to). */
  income: IncomeSummary | null
  /** The instrument's asset class: a share's cost shows 2 decimals, a coin's up to 4. */
  assetClass?: string
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="asd-pos-row">
      <span className="asd-pos-label">{label}</span>
      <span className={`asd-pos-value${tone ? ` ${tone}` : ''}`}>{value}</span>
    </div>
  )
}

// Rail summary only — the acquisition + realized lot tables now live in the Position subtab
// (the rail was too narrow for them). This card keeps the at-a-glance figures and links across.
export function YourPositionCard({ position, symbol, income, assetClass }: Props) {
  const intl = useAppIntl()
  const navigate = useNavigate()
  const sym = getCurrencySymbol(position.cost_currency)
  const hasPL = position.unrealized_pl_base != null && position.unrealized_pl_pct != null
  const unvested = position.unvested

  return (
    <Panel
      title={intl.formatMessage({ id: "intel.field.feedf81f", defaultMessage: "Your Position" })}
      // Decorative — the whole card already navigates to the Position tab (see the
      // clickable wrapper in AssetDetailView), same "See all" convention as the Price
      // Alerts/Analyst Consensus rail cards' header actions.
      actions={
        <span className="asd-rail-manage" aria-hidden="true">
          {intl.formatMessage({ id: 'miss.seeAll', defaultMessage: 'See all' })} <ArrowRight size={12} />
        </span>
      }
      className="asd-rail-panel"
      {...(position.position_id
        ? {
            ...entityRefProps(
              'position',
              position.position_id,
              symbol ?? 'Position',
              `${symbol ?? ''} position`,
              `${position.qty} units`,
            ),
            'data-ctx': '',
            'data-ctx-type': 'position',
            'data-ctx-fields': buildCtxFields(
              filterByDescriptor('position', {
                symbol,
                quantity: position.qty,
                cost_currency: position.cost_currency,
              }),
            ),
            draggable: true,
          }
        : {})}
    >
      <Stack gap="--space-2">
        <Row
          label={intl.formatMessage({ id: "intel.field.66857460", defaultMessage: "Quantity" })}
          value={position.qty.toLocaleString(getNumberLocale(), { maximumFractionDigits: 8 })}
        />
        {position.cost_basis != null && (
          <>
            {/* Per-share stays in the NATIVE trading currency (what you actually paid per
                share) — but the total is base currency, same convention + derivation as
                PositionSubtab's "Avg cost" sub-caption (market value minus unrealized P&L,
                not cost_basis*qty converted at TODAY's rate): comparable to every other
                figure on this card (Market value/P&L/weight are all base already). */}
            <Row
              label={intl.formatMessage({ id: "intel.field.63656ff7", defaultMessage: "Cost basis" })}
              value={`${sym}${position.cost_basis.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: priceDigits(assetClass) ?? 4 })}`}
            />
            {position.unrealized_pl_base != null && (
              <Row
                label={intl.formatMessage({ id: "intel.field.a2b5dc42", defaultMessage: "Total cost basis" })}
                value={fBase(position.market_value_base - position.unrealized_pl_base)}
              />
            )}
          </>
        )}
        <Row label={intl.formatMessage({ id: "intel.field.341c83ad", defaultMessage: "Market value" })} value={fBase(position.market_value_base)} />
        <Row label={intl.formatMessage({ id: "intel.field.0c3963cb", defaultMessage: "Portfolio weight" })} value={fPct(position.weight_pct)} />
        {hasPL && (
          <Row
            label={intl.formatMessage({ id: "intel.field.288b46b6", defaultMessage: "Unrealized P&L" })}
            value={`${fBase(position.unrealized_pl_base!)} (${fPct(position.unrealized_pl_pct!, { sign: true })})`}
            tone={plClass(position.unrealized_pl_base)}
          />
        )}
        <Row label={intl.formatMessage({ id: "intel.field.e8d45acc", defaultMessage: "Dividends received" })} value={income ? fBase(income.trailing_12m_base) : '—'} />
        {unvested && (
          <div className="asd-pos-unvested">
            <Row
              label={intl.formatMessage({ id: "intel.field.57e3f6cf", defaultMessage: "Unvested" })}
              value={intl.formatMessage({ id: 'miss.units', defaultMessage: '{count} units' }, { count: unvested.units.toLocaleString(getNumberLocale(), { maximumFractionDigits: 4 }) })}
              tone="muted"
            />
            <Row label={intl.formatMessage({ id: "intel.field.e7c8d4c3", defaultMessage: "Unvested value" })} value={fBase(unvested.market_value_base)} tone="muted" />
            {unvested.next_vest && (
              <Text size="xs" tone="faint">
                {intl.formatMessage({ id: 'miss.nextVest', defaultMessage: 'Next vest {date}: {count} units' }, { date: fDate(unvested.next_vest.date, 'short', 'always'), count: unvested.next_vest.units.toLocaleString(getNumberLocale(), { maximumFractionDigits: 4 }) })}
              </Text>
            )}
            <button
              type="button"
              className="asd-pos-unvested-link"
              onClick={(e) => {
                e.stopPropagation()
                navigate({ to: '/investments', search: { sub: 'equity' } } as never)
              }}
            >
              {intl.formatMessage({ id: 'miss.viewGrant', defaultMessage: 'View grant in Equity Comp' })} <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        )}
      </Stack>
    </Panel>
  )
}
