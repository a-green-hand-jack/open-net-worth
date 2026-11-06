import { getNumberLocale } from '../../utils/format'
import type { IntlShape } from 'react-intl'
import { FormattedMessage } from './FormattedMessage'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useState } from 'react'
import { Panel, Skeleton, Stack, Text } from '../ui'
import { entityRefProps } from '../../utils/mentionable'
import { buildCtxFields } from '../../lucius/ctxFields'
import { filterByDescriptor } from '../../lucius/entityRegistry'
import { countryFlag, fCompact, fDate, fMonth, fPrice, safeHref } from '../../utils/format'
import { displayTicker } from './assetDisplay'
import type { AssetFacts, AssetInfo, CryptoFacts } from '../../types/assetDetail'

interface Row {
  label: string
  value: string
  href?: string
}

function FactRow({ label, value, href }: Row) {
  return (
    <div className="asd-fact-row">
      <span className="asd-fact-label">{label}</span>
      {href ? (
        <a
          className="asd-fact-value asd-fact-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {value}
        </a>
      ) : (
        <span className="asd-fact-value">{value}</span>
      )}
    </div>
  )
}

interface Props {
  asset: AssetInfo
  /** The instrument this card describes — the asset block itself carries no id. */
  instrumentId?: string
  facts: AssetFacts
  cryptoFacts?: CryptoFacts | null
  /** True while a real facts/peers/description synthesis pass is actually running
   *  (`refreshing` from useAssetDetail — the same signal `_do_refresh` drives). Owner-
   *  reproduced live bug, 2026-08-31 (KODK cold-open): with no loading state at all here,
   *  the card just showed whatever sparse baseline data existed (often only Symbol/
   *  Exchange, pulled straight off `asset` rather than the AI-synthesized `facts`) with no
   *  indication more was coming. */
  generating?: boolean
}

/** "Network" id from CoinGecko is a slug ("binance-smart-chain") — humanize it. */
function prettyNetwork(id: string): string {
  return id
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Crypto Key Facts from real CoinGecko data (market cap / supply / ATH / launch). */
function cryptoRows(asset: AssetInfo, cf: CryptoFacts, intl: IntlShape): Row[] {
  const sym = asset.symbol || ''
  const link = cf.homepage ? safeHref(cf.homepage) : null
  return [
    { label: intl.formatMessage({ id: 'intel.fact.eb6433cf', defaultMessage: 'Symbol' }), value: displayTicker(asset) || asset.name },
    cf.category && { label: intl.formatMessage({ id: 'intel.fact.ff3a7b97', defaultMessage: 'Category' }), value: cf.category },
    cf.network && { label: intl.formatMessage({ id: 'intel.fact.af39be20', defaultMessage: 'Network' }), value: prettyNetwork(cf.network) },
    cf.market_cap != null && { label: intl.formatMessage({ id: 'intel.fact.3639d608', defaultMessage: 'Market cap' }), value: `$${fCompact(cf.market_cap)}` },
    cf.market_cap_rank != null && { label: intl.formatMessage({ id: 'intel.fact.284b47db', defaultMessage: 'Rank' }), value: `#${cf.market_cap_rank}` },
    cf.circulating_supply != null && {
      label: intl.formatMessage({ id: 'intel.fact.6729b655', defaultMessage: 'Circulating' }),
      value: `${fCompact(cf.circulating_supply)}${sym ? ` ${sym}` : ''}`,
    },
    cf.max_supply != null && {
      label: intl.formatMessage({ id: 'intel.fact.1005f717', defaultMessage: 'Max supply' }),
      value: `${fCompact(cf.max_supply)}${sym ? ` ${sym}` : ''}`,
    },
    cf.ath != null && {
      label: intl.formatMessage({ id: 'intel.fact.63692d72', defaultMessage: 'All-time high' }),
      value: `$${fPrice(cf.ath)}${cf.ath_date ? ` (${fMonth(cf.ath_date, 'short', 'always')})` : ''}`,
    },
    cf.genesis_date && { label: intl.formatMessage({ id: 'intel.fact.7e1b52c3', defaultMessage: 'Launch' }), value: fMonth(cf.genesis_date, 'short', 'always') },
    link && { label: intl.formatMessage({ id: 'intel.fact.88d2647b', defaultMessage: 'Website' }), value: hostname(cf.homepage as string), href: link },
  ].filter(Boolean) as Row[]
}

/** Equity Key Facts from the (AI-synthesized) brief. */
function equityRows(asset: AssetInfo, facts: AssetFacts, intl: IntlShape): Row[] {
  const countryCode = facts.country || asset.country
  return [
    { label: intl.formatMessage({ id: 'intel.fact.eb6433cf', defaultMessage: 'Symbol' }), value: displayTicker(asset) || asset.name },
    facts.sector && { label: intl.formatMessage({ id: 'intel.fact.4c0fdcde', defaultMessage: 'Sector' }), value: facts.sector },
    facts.industry && { label: intl.formatMessage({ id: 'intel.fact.348c0ef6', defaultMessage: 'Industry' }), value: facts.industry },
    (facts.exchange || asset.exchange) && {
      label: intl.formatMessage({ id: 'intel.fact.2a4dd22f', defaultMessage: 'Exchange' }),
      value: facts.exchange || asset.exchange || '',
    },
    countryCode && { label: intl.formatMessage({ id: 'intel.fact.9ccef0fa', defaultMessage: 'Country' }), value: `${countryFlag(countryCode)} ${countryCode}` },
    facts.ceo && { label: intl.formatMessage({ id: 'intel.fact.e6f00dca', defaultMessage: 'CEO' }), value: facts.ceo },
    facts.employees && { label: intl.formatMessage({ id: 'intel.fact.387341a3', defaultMessage: 'Employees' }), value: facts.employees.toLocaleString(getNumberLocale()) },
    facts.ipo_date && {
      label: intl.formatMessage({ id: 'intel.fact.64023ffd', defaultMessage: 'IPO Date' }),
      value: fDate(facts.ipo_date, 'short', 'always'),
    },
  ].filter(Boolean) as Row[]
}

export function KeyFactsCard({ asset, instrumentId, facts, cryptoFacts, generating }: Props) {
  const intl = useAppIntl()
  const [expanded, setExpanded] = useState(false)

  const isCrypto = !!cryptoFacts
  const rows = isCrypto ? cryptoRows(asset, cryptoFacts, intl) : equityRows(asset, facts, intl)

  const desc = asset.description
  const descPreview = desc && !expanded ? desc.slice(0, 200) + (desc.length > 200 ? '…' : '') : desc

  // Crypto facts are real-time CoinGecko data, never LLM-synthesized — no generating state
  // applies there. `sparse` means only the always-available baseline (Symbol/Exchange, read
  // straight off `asset`) has landed, nothing from the AI-synthesized `facts` object yet.
  const showGenerating = !isCrypto && generating && rows.length <= 2 && !desc

  return (
    <Panel
      title={intl.formatMessage({ id: "intel.field.c07e63e7", defaultMessage: "Key Facts" })}
      className="asd-rail-panel"
      actions={
        showGenerating ? (
          <span className="asd-pi-updating" role="status" aria-label={intl.formatMessage({ id: "intel.field.9f246b11", defaultMessage: "Key facts are generating" })}>
            <span className="ui-btn__spinner" aria-hidden="true" />
            {<FormattedMessage id="intel.extra.fcbce60e" defaultMessage={"Generating"} />}
          </span>
        ) : undefined
      }
      {...(instrumentId
        ? {
            ...entityRefProps(
              'asset_brief',
              instrumentId,
              asset.ticker ?? asset.name,
              `${asset.ticker ?? ''} ${asset.name ?? ''} research brief`,
              asset.name ?? 'Research brief',
            ),
            'data-ctx': '',
            'data-ctx-type': 'asset_brief',
            'data-ctx-fields': buildCtxFields(
              filterByDescriptor('asset_brief', {
                symbol: asset.ticker,
                name: asset.name,
              }),
            ),
            draggable: true,
          }
        : {})}
    >
      <Stack gap="--space-2">
        {rows.map((r) => (
          <FactRow key={r.label} label={r.label} value={r.value} href={r.href} />
        ))}

        {showGenerating && (
          <div className="asd-skel-stack" role="status" aria-label={intl.formatMessage({ id: "intel.field.fcbce60e", defaultMessage: "Generating" })}>
            <Skeleton height={13} width="85%" />
            <Skeleton height={13} width="70%" />
            <Skeleton height={13} width="60%" />
          </div>
        )}

        {desc && (
          <div className="asd-fact-desc">
            <Text size="sm" tone="faint">
              {descPreview}
            </Text>
            {desc.length > 200 && (
              <button
                type="button"
                className="asd-fact-desc-toggle"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? intl.formatMessage({ id: 'miss.showLess', defaultMessage: 'Show less' }) : intl.formatMessage({ id: 'miss.viewMore', defaultMessage: 'View more' })}
              </button>
            )}
          </div>
        )}

        {/* Crypto facts are real CoinGecko data; equity facts are AI-synthesized. */}
        {isCrypto ? (
          <Text size="xs" tone="faint" className="asd-fact-disclaimer">
            {<FormattedMessage id="intel.extra.5bdc80be" defaultMessage={"Data via CoinGecko"} />}
          </Text>
        ) : (
          facts.unverified && (
            <Text size="xs" tone="faint" className="asd-fact-disclaimer">
              {<FormattedMessage id="intel.extra.f1f123a3" defaultMessage={"AI-generated facts, may be inaccurate."} />}
            </Text>
          )
        )}
      </Stack>
    </Panel>
  )
}
