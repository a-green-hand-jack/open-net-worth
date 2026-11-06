import { getNumberLocale } from '../../utils/format'
import { useAppIntl } from '../../i18n/useAppIntl'
import { FormattedMessage } from './FormattedMessage'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, RefreshCw, ArrowRight } from '../../ui/icons'
import { Button } from '../ui'
import { Spark } from '../../lucius/identity'
import { getCurrencySymbol } from '../../utils/format'
import { luciusSuggestAlerts, luciusReviewList } from '../../utils/luciusEngine'
import type {
  AlertSuggestion,
  LuciusAsset,
  LuciusContext,
  LuciusFinding,
  LuciusReviewItem,
} from '../../utils/luciusEngine'

// Lucius PROPOSES; the user disposes. None of these surfaces mutate watchlist
// state on their own — every suggestion is a card the user adds, edits, or skips.

function opSym(op: 'above' | 'below'): string {
  return op === 'above' ? '≥' : '≤'
}

// ── Draft / Rewrite link (instruction fields) ─────────────────────────────────

export function LuciusDraftLink({
  label,
  onDraft,
}: {
  label?: string
  onDraft: () => void
}) {
  const intl = useAppIntl()
  const [thinking, setThinking] = useState(false)
  function run() {
    setThinking(true)
    setTimeout(() => {
      setThinking(false)
      onDraft()
    }, 550)
  }
  return (
    <button type="button" className="intel-lx-draft" disabled={thinking} onClick={run}>
      <span className={thinking ? 'lx-pulse' : ''}>
        <Sparkles size={11} />
      </span>
      {thinking ? intl.formatMessage({ id: 'intel.assist.drafting', defaultMessage: 'Drafting…' }) : label ?? intl.formatMessage({ id: 'intel.assist.draftWith', defaultMessage: 'Draft with Lucius' })}
    </button>
  )
}

// ── Per-ticker alert suggestions (inside the Price Alerts modal) ───────────────

export function LuciusAlertSuggest({
  asset,
  ctx,
  onAdd,
}: {
  asset: LuciusAsset
  ctx: LuciusContext
  onAdd: (s: AlertSuggestion) => void
}) {
  const intl = useAppIntl()
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'shown'>('idle')
  const [items, setItems] = useState<AlertSuggestion[]>([])
  const sym = getCurrencySymbol(asset.ccy)
  const latestIntl = useRef(intl)
  useEffect(() => { latestIntl.current = intl }, [intl])
  const localeRef = useRef(intl.locale)

  useEffect(() => {
    if (localeRef.current === intl.locale) return
    localeRef.current = intl.locale
    setItems(current => {
      const refreshed = luciusSuggestAlerts(asset, ctx, intl)
      return current.map(item => refreshed.find(next => next.sourceKey === item.sourceKey) ?? item)
    })
    // Preserve the current selection while translating only generated suggestions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intl.locale])

  function generate() {
    setPhase('thinking')
    setTimeout(() => {
      setItems(luciusSuggestAlerts(asset, ctx, latestIntl.current))
      setPhase('shown')
    }, 800)
  }
  function take(s: AlertSuggestion, i: number) {
    onAdd(s)
    setItems((its) => its.filter((_, j) => j !== i))
  }
  function dismiss(i: number) {
    setItems((its) => its.filter((_, j) => j !== i))
  }

  if (phase === 'idle') {
    return (
      <div className="lx-surface intel-lx-idle">
        <span className="lx-mark">
          <Sparkles size={13} />
        </span>
        <div className="intel-lx-idle-body">
          <div className="intel-lx-idle-title">{<FormattedMessage id="intel.static.not_sure_what_to_set_44a45b64" defaultMessage={"Not sure what to set?"} />}</div>
          <div className="intel-lx-idle-sub">
            {intl.formatMessage({ id: 'intel.assist.suggestExplanation', defaultMessage: 'Lucius can suggest alert levels for {symbol} from your position and target mix.' }, { symbol: asset.symbol })}
          </div>
        </div>
        <Button
          size="sm"
          variant="primary"
          className="fi-lucius intel-lx-suggest-cta"
          iconLeft={<Spark size={15} ariaHidden />}
          onClick={generate}
        >
          {<FormattedMessage id="intel.extra.57d0a930" defaultMessage={"Suggest alerts"} />}
        </Button>
      </div>
    )
  }
  if (phase === 'thinking') {
    return (
      <div className="lx-surface">
        <div className="lx-thinking">
          <span className="lx-pulse">
            <Sparkles size={13} />
          </span>
          {intl.formatMessage({ id: 'intel.assist.reading', defaultMessage: 'Reading {symbol}’s price, your position, and target mix…' }, { symbol: asset.symbol })}
        </div>
      </div>
    )
  }
  return (
    <div className="lx-surface intel-lx-shown">
      <div className="intel-lx-shown-head">
        <span className="lx-mark lx-mark--sm">
          <Sparkles size={12} />
        </span>
        <span className="intel-lx-shown-title">
          {items.length
            ? intl.formatMessage({ id: 'intel.assist.suggestCount', defaultMessage: 'Lucius suggests {count, plural, one {# alert} other {# alerts}}' }, { count: items.length })
            : intl.formatMessage({ id: 'intel.assist.handled', defaultMessage: 'All suggestions handled' })}
        </span>
        <div className="intel-lx-shown-actions">
          {items.length > 1 && (
            <button
              type="button"
              className="intel-lx-addall"
              onClick={() => {
                items.forEach(onAdd)
                setItems([])
              }}
            >
              {<FormattedMessage id="intel.extra.e4ac3a83" defaultMessage={"Add all"} />}
            </button>
          )}
          <button
            type="button"
            className="intel-lx-regen"
            title={intl.formatMessage({ id: "intel.field.d6bb463a", defaultMessage: "Regenerate" })}
            aria-label={intl.formatMessage({ id: "intel.field.d6bb463a", defaultMessage: "Regenerate" })}
            onClick={generate}
          >
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="intel-lx-empty">
          {intl.formatMessage({ id: 'intel.assist.added', defaultMessage: 'Added what you need.' })}{' '}
          <button type="button" className="intel-lx-more" onClick={generate}>
            {intl.formatMessage({ id: 'intel.assist.more', defaultMessage: 'Suggest more' })} <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="intel-lx-sugs">
          {items.map((s, i) => (
            <div key={i} className="intel-lx-sug">
              <span className="intel-lx-sug-chip">
                {opSym(s.op)} {sym}
                {s.value.toLocaleString(getNumberLocale())}
              </span>
              <div className="intel-lx-sug-body">
                <div className="intel-lx-sug-why">{s.why}</div>
                <div className="intel-lx-sug-note">
                  <span className="intel-lx-sug-note-label">{<FormattedMessage id="intel.static.instruction_3f351492" defaultMessage={"Instruction •"} />}</span>
                  {s.note}
                </div>
              </div>
              <div className="intel-lx-sug-actions">
                <button type="button" className="intel-lx-sug-add" onClick={() => take(s, i)}>
                  {<FormattedMessage id="intel.extra.c5573507" defaultMessage={"Add"} />}
                </button>
                <button type="button" className="intel-lx-sug-skip" onClick={() => dismiss(i)}>
                  {<FormattedMessage id="intel.extra.5844fa43" defaultMessage={"Skip"} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Whole-list review (inside the workspace list view) ─────────────────────────

export function LuciusReviewButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="primary"
      className="fi-lucius intel-lx-review-btn"
      iconLeft={<Spark size={15} ariaHidden />}
      aria-pressed={active}
      onClick={onClick}
    >
      {<FormattedMessage id="intel.extra.39b7237b" defaultMessage={"Review with Lucius"} />}
    </Button>
  )
}

const SEV_COLOR: Record<LuciusFinding['sev'], string> = {
  gap: 'var(--warn)',
  risk: 'var(--bad)',
  info: 'var(--faint)',
}

export function LuciusReviewPanel({
  listName,
  listMuted,
  items,
  ctx,
  onFix,
  onClose,
}: {
  listName: string
  listMuted: boolean
  items: LuciusReviewItem[]
  ctx: LuciusContext
  onFix: (finding: LuciusFinding) => void
  onClose: () => void
}) {
  const intl = useAppIntl()
  const [thinking, setThinking] = useState(true)
  const [result, setResult] = useState<ReturnType<typeof luciusReviewList> | null>(null)

  useEffect(() => {
    setThinking(true)
    const t = setTimeout(() => {
      setResult(luciusReviewList({ name: listName, muted: listMuted, items }, ctx, intl))
      setThinking(false)
    }, 850)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listName, intl.locale])

  return (
    <div className="lx-surface intel-lx-review">
      {thinking || !result ? (
        <div className="lx-thinking">
          <span className="lx-pulse">
            <Sparkles size={13} />
          </span>
          {intl.formatMessage({ id: 'intel.assist.reviewing', defaultMessage: 'Reviewing {name} — coverage, concentration, and instructions…' }, { name: listName })}
        </div>
      ) : (
        <>
          <div className="intel-lx-review-head">
            <span className="lx-mark">
              <Sparkles size={13} />
            </span>
            <div className="intel-lx-review-headbody">
              <div className="intel-lx-review-eyebrow">{<FormattedMessage id="intel.static.lucius_review_efb94ea5" defaultMessage={"Lucius review"} />}</div>
              <div className="intel-lx-review-headline">{result.headline}</div>
            </div>
            <button
              type="button"
              className="intel-lx-review-close"
              onClick={onClose}
              aria-label={intl.formatMessage({ id: "intel.field.1013b05b", defaultMessage: "Close review" })}
            >
              <X size={11} />
            </button>
          </div>
          {result.findings.map((f) => (
            <div key={f.key} className="intel-lx-finding">
              <span
                className="intel-lx-finding-dot"
                style={{ background: SEV_COLOR[f.sev] }}
                aria-hidden
              />
              <div className="intel-lx-finding-body">
                <div className="intel-lx-finding-title">{f.title}</div>
                <div className="intel-lx-finding-text">{f.text}</div>
              </div>
              {!f.noCta && f.cta && (
                <button type="button" className="intel-lx-finding-cta" onClick={() => onFix(f)}>
                  {f.cta}
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
