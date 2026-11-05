import { useConnectorPrompt } from './useConnectorPrompts'
import { useConnectorDescription, useConnectorLongDescription, useCuratedDescription, useCuratedLongDescription } from './useConnectorDescription'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useConnectorLabels, useConnectorName } from './useConnectorLabels'
// The directory preview page (spec §6) — ported from the prototype's `dirPreview` branch.
//
// Top to bottom: who this is and one action, the description, the attribution line, the chip
// rows (tools / prompts / categories), and a quiet Details footer carrying the endpoint and
// the outbound links.
//
// THREE DELIBERATE DEVIATIONS from the prototype:
//
//  1. For an ALREADY-INSTALLED entry the prototype renders a Disconnect button and a kebab
//     here. That contradicts the spec's own two rules — §2 "nothing about a connector is
//     configured from a card action ... or a second place" and §3 "[the detail page] is the
//     only place a connector can be disabled". Duplicating the control here would be that
//     second place, so an installed entry gets its status badge plus one action routing to
//     the detail page, which owns connect/disconnect/remove.
//  2. The prototype's "More info" block is three `href="#"` placeholders. Shipping three dead
//     links is worse than shipping none, so the block renders REAL links from `repoUrl` /
//     `homepageUrl` and disappears entirely when an entry has neither — the ordinary case for
//     a hosted vendor server with no public repo.
//  3. Spec §5's boxed vendor-trust panel does NOT render here (D23). It stated the publisher
//     a second time, the endpoint a second time, and headed itself with our internal name for
//     the concept, on the one page whose job is "should I even look at this". Provenance is
//     an attribution line plus — for an MCP entry only, spec §5 being MCP-only — one muted
//     sentence (`PublisherLine`); the endpoint keeps its place, in Details. The panel still
//     renders where you COMMIT to an endpoint (the add flow's review step) or INSPECT one you
//     already run (the detail page).
//
// The header is the SHARED `.cn-idhead` block, not this file's own: the detail page renders
// the identical thing, so a connector looks the same before and after you add it (D26).

import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import { Badge, Btn, Field, Mono } from './primitives'
import { Icons } from './icons'
import { ExternalLink, FIRST_PARTY_PUBLISHER, PublisherLine } from './VendorTrust'
import { MODAL_BODY_MIN_HEIGHT } from './DirectoryBrowser'
import { previewEndpoint, type DirectoryRow } from './catalog'
import { resolveToolList } from './toolList'
import { useChatComposerOptional } from '../../../state/chatComposer'
import { ArrowRight } from '../../../ui/icons'

export interface DirectoryPreviewProps {
  d: DirectoryRow
  /** Status text for an installed entry, from the live connector. */
  statusText?: string
  statusTone?: 'good' | 'bad' | ''
  prompts?: string[]
  onAdd: (entry: DirectoryRow) => void
  onConfigure: (entry: DirectoryRow) => void
  /** On a phone the modal pins the action in its footer (`PreviewAction`) instead, so the
   *  header drops it rather than show it twice. */
  actionInFooter?: boolean
  /** The tools the CONNECTED server actually advertised — beats any recorded list. */
  liveTools?: string[]
}

/** The one action the preview exists to drive. `lg`, not `xs`: at the dense in-row size it
 *  read as the lightest thing in a header built around a 52px tile. */
export function PreviewAction({
  d,
  onAdd,
  onConfigure,
  className,
}: Pick<DirectoryPreviewProps, 'd' | 'onAdd' | 'onConfigure'> & {
  className?: string
}): JSX.Element {
  const { formatMessage } = useAppIntl()
  return d.installed ? (
    <Btn size="lg" className={className} onClick={() => onConfigure(d)}>
      {formatMessage({ id: 'connectors.preview.openSettings', defaultMessage: 'Open settings' })}
    </Btn>
  ) : (
    <Btn size="lg" variant="primary" className={className} onClick={() => onAdd(d)}>
      {d.mcp ? formatMessage({ id: 'connectors.preview.add', defaultMessage: 'Add' }) : formatMessage({ id: 'connectors.preview.addConnector', defaultMessage: 'Add connector' })}
    </Btn>
  )
}

/** Where the publisher lives. Docs page first — it is the one a reader wants; the repo is the
 *  fallback for an open-source server that has no product page. Never a fabricated URL. */
function publisherHref(d: DirectoryRow): string | undefined {
  return d.homepageUrl ?? d.repoUrl
}

/** One chip. A tool chip's label is the RAW registry name, unchanged — it is the exact
 *  identifier the permission ladder stores against (CLAUDE.md), and this page is a summary
 *  of the same tools that ladder governs. User-friendly phrasing belongs in the entry's
 *  prose description ("has web search functionality"), never in place of the identifier. */
interface Chip {
  key: string
  label: string
  /** A chip that DOES something (a prompt suggestion) renders as a button; the rest are labels. */
  onClick?: () => void
}

const plainChip = (value: string): Chip => ({ key: value, label: value })

/** A tool list longer than this folds behind "Show all N" — 37 Coinbase or ~400 Bybit chips
 *  would push the description's Details footer off the page (owner, 2026-10-31). */
const CHIP_FOLD = 9

/** A labelled chip row. `note` is a muted aside after the count (where a tool list came from). */
function ChipRow({
  label,
  items,
  note,
  fold = false,
}: {
  label: string
  items: Chip[]
  note?: string
  fold?: boolean
}): JSX.Element | null {
  const { formatMessage } = useAppIntl()
  const [expanded, setExpanded] = useState(false)
  if (!items.length) return null
  const folded = fold && !expanded && items.length > CHIP_FOLD
  const shown = folded ? items.slice(0, CHIP_FOLD) : items
  return (
    <div>
      <div className="cn-sublabel" style={{ marginBottom: 8 }}>
        {label} <Badge>{items.length}</Badge>
        {note ? <span className="cn-chipnote">{note}</span> : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {shown.map((c) =>
          c.onClick ? (
            <button
              key={c.key}
              type="button"
              className="cn-tagchip cn-promptchip"
              onClick={c.onClick}
            >
              {c.label}
              <ArrowRight size={12} aria-hidden="true" className="cn-promptchip-arrow" />
            </button>
          ) : (
            <span key={c.key} className="cn-tagchip">
              {c.label}
            </span>
          ),
        )}
        {fold && items.length > CHIP_FOLD ? (
          <button
            type="button"
            className="cn-tagchip cn-chipmore"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? formatMessage({ id: 'connectors.preview.showLess', defaultMessage: 'Show less' }) : formatMessage({ id: 'connectors.preview.showAll', defaultMessage: 'Show all {count}' }, { count: items.length })}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Copy-to-clipboard for the endpoint. `navigator.clipboard` is absent over plain http and in
 *  jsdom, so the failure is swallowed rather than thrown at the user — the value is on screen
 *  and selectable either way. */
function CopyButton({ value }: { value: string }): JSX.Element {
  const { formatMessage } = useAppIntl()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return (
    <Btn
      size="xs"
      aria-label={copied ? formatMessage({ id: 'connectors.preview.copied', defaultMessage: 'Copied' }) : formatMessage({ id: 'connectors.preview.copy', defaultMessage: 'Copy' })}
      title={copied ? formatMessage({ id: 'connectors.preview.copied', defaultMessage: 'Copied' }) : formatMessage({ id: 'connectors.preview.copy', defaultMessage: 'Copy' })}
      className="cn-copybtn"
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {})
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Icons.check /> : <Icons.copy />}
    </Btn>
  )
}

/**
 * The Details footer: author, the endpoint this entry actually connects to, and the outbound
 * links. Everything here is optional — a native connector has no endpoint, and a hosted
 * vendor server routinely has no repo or docs page — so the whole block, its divider
 * included, disappears when an entry has none of it.
 */
function Details({ d }: { d: DirectoryRow }): JSX.Element | null {
  const { formatMessage } = useAppIntl()
  const endpoint = previewEndpoint(d)
  const links: [string, string][] = []
  if (d.homepageUrl) links.push([formatMessage({ id: 'connectors.preview.documentation', defaultMessage: 'Documentation' }), d.homepageUrl])
  if (d.repoUrl) links.push([formatMessage({ id: 'connectors.preview.source', defaultMessage: 'Source repository' }), d.repoUrl])
  if (d.supportUrl) links.push([formatMessage({ id: 'connectors.preview.support', defaultMessage: 'Support' }), d.supportUrl])
  if (d.privacyUrl) links.push([formatMessage({ id: 'connectors.preview.privacy', defaultMessage: 'Privacy policy' }), d.privacyUrl])
  if (!d.publisher && !endpoint && !links.length) return null

  const href = publisherHref(d)
  // `previewEndpoint` returns a URL for a hosted server and a full command line for a local
  // one. Calling `npx -y firecrawl-mcp` a URL would simply be wrong, so the label follows the
  // value.
  const isUrl = !!endpoint && /^https?:\/\//i.test(endpoint)

  return (
    <>
      <hr className="rd-hr" />
      <div>
        <div className="cn-sublabel" style={{ marginBottom: 8 }}>
          {formatMessage({ id: 'connectors.preview.details', defaultMessage: 'Details' })}
        </div>
        <div className="cn-details-grid">
          {d.publisher ? (
            // "Author" is only true for a real MCP entry (their code runs here). A native
            // connector's integration is ours — the named publisher just operates the API it
            // calls — so it reads "Vendor" instead (owner correction, 2026-08-21; same
            // `mcp`-bound distinction as `PublisherLine`'s "Developed by"/"Powered by" verb).
            <Field label={d.mcp || d.publisher === FIRST_PARTY_PUBLISHER ? formatMessage({ id: 'connectors.preview.author', defaultMessage: 'Author' }) : formatMessage({ id: 'connectors.preview.vendor', defaultMessage: 'Vendor' })}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {href ? <ExternalLink href={href}>{d.publisher}</ExternalLink> : d.publisher}
              </span>
            </Field>
          ) : null}
          {links.length ? (
            <Field label={formatMessage({ id: 'connectors.preview.moreInfo', defaultMessage: 'More info' })}>
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 5,
                  fontSize: 13,
                }}
              >
                {links.map(([label, url]) => (
                  <ExternalLink key={label} href={url}>
                    {label}
                  </ExternalLink>
                ))}
              </span>
            </Field>
          ) : null}
          {endpoint ? (
            <Field label={isUrl ? formatMessage({ id: 'connectors.preview.url', defaultMessage: 'Connector URL' }) : formatMessage({ id: 'connectors.preview.command', defaultMessage: 'Command' })}>
              <span style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                <code className="rd-code" style={{ padding: '7px 10px', flex: 1, minWidth: 0 }}>
                  {endpoint}
                </code>
                <CopyButton value={endpoint} />
              </span>
            </Field>
          ) : null}
        </div>
      </div>
    </>
  )
}

/** The identity block (`.cn-idhead`): a large tile, the name and its one-line sub stacked
 *  beside it and vertically centred against it, and ONE action pinned right. Shares its shape
 *  and its stylesheet rules with the detail page's `Identity`, so the two cannot drift. */
function Header({
  d,
  status,
  action,
}: {
  d: DirectoryRow
  status: ReactNode
  action: ReactNode
}): JSX.Element {
  const { formatMessage } = useAppIntl()
  const displayName = useConnectorName()
  const description = useConnectorDescription()
  const curatedDescription = useCuratedDescription()
  return (
    <div className="cn-idhead">
      <Mono icon={d.icon} hue={d.hue} logo={d.logo} size="lg" />
      <div className="cn-idhead-main">
        <div className="cn-idhead-name">
          {displayName(d.id, d.name)}
          {d.verification === 'verified' ? <span className="cn-verified-tag">{formatMessage({ id: 'connectors.verified', defaultMessage: 'Verified' })}</span> : null}
          {d.tag ? <span className="cn-tag">{d.tag === 'Default' ? formatMessage({ id: 'connectors.defaultTag', defaultMessage: 'Default' }) : d.tag}</span> : null}
          {status}
        </div>
        <div className="cn-idhead-sub">{d.mcp ? curatedDescription(d.id, d.sub) : description(d.id, d.sub, false)}</div>
      </div>
      {action ? <div className="cn-idhead-actions">{action}</div> : null}
    </div>
  )
}

export function DirectoryPreview({
  d,
  statusText,
  statusTone = '',
  prompts,
  onAdd,
  onConfigure,
  actionInFooter = false,
  liveTools,
}: DirectoryPreviewProps): JSX.Element {
  const { formatMessage } = useAppIntl()
  const labels = useConnectorLabels()
  const prompt = useConnectorPrompt()
  const longDescription = useConnectorLongDescription()
  const curatedLong = useCuratedLongDescription()
  const composer = useChatComposerOptional()
  const toolList = resolveToolList(d, liveTools)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minHeight: MODAL_BODY_MIN_HEIGHT,
      }}
    >
      <Header
        d={d}
        status={d.installed && statusText ? <Badge tone={statusTone}>{labels.rowStatus(statusText)}</Badge> : null}
        action={
          actionInFooter ? null : <PreviewAction d={d} onAdd={onAdd} onConfigure={onConfigure} />
        }
      />

      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{d.mcp ? curatedLong(d.id, d.desc) : longDescription(d.id, d.desc, false)}</p>

      <PublisherLine
        publisher={d.publisher}
        href={publisherHref(d)}
        verification={d.verification}
        mcp={d.mcp}
      />

      <ChipRow
        label={toolList.label === 'Tools' ? formatMessage({ id: 'connectors.preview.tools', defaultMessage: 'Tools' }) : formatMessage({ id: 'connectors.preview.examples', defaultMessage: 'Example tools' })}
        items={toolList.names.map(plainChip)}
        note={toolList.note === 'from your connection' ? formatMessage({ id: 'connectors.preview.connection', defaultMessage: 'from your connection' }) : toolList.note === "from the vendor's docs" ? formatMessage({ id: 'connectors.preview.vendorDocs', defaultMessage: "from the vendor's docs" }) : toolList.note?.startsWith('as of ') ? formatMessage({ id: 'connectors.preview.asOf', defaultMessage: 'as of {date}' }, { date: toolList.note.slice(6) }) : toolList.note}
        fold
      />
      <ChipRow
        label={formatMessage({ id: 'connectors.detail.prompts', defaultMessage: 'Prompt suggestions' })}
        items={(prompts ?? []).map((p, i) => ({
          ...plainChip(prompt(d.id.startsWith('web_search:') ? 'web_search' : d.id, i, p)),
          // Same as on a connector's own page: the prompt lands in Lucius's composer, unsent.
          onClick: composer
            ? () => {
                composer.setPendingText(prompt(d.id.startsWith('web_search:') ? 'web_search' : d.id, i, p))
                composer.requestOpen()
              }
            : undefined,
        }))}
      />
      {/* The connector's TOPICS, never its family. The family is the lane the reader is
          already browsing — printing it back as the sole "category" (Stripe → `MCP`) said
          nothing. `families` keeps its real job: the list sections and the directory filter. */}
      <ChipRow label={formatMessage({ id: 'connectors.preview.categories', defaultMessage: 'Categories' })} items={d.categories.map((category) => ({ key: category, label: labels.category(category) }))} />

      <Details d={d} />
    </div>
  )
}
