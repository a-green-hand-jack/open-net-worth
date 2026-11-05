import { useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { safeHref } from '../../utils/format'
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight } from '../../ui/icons'
import type { Citation, KeyIssue } from '../../types/assetDetail'

function SourcesList({ sources, tone }: { sources: Citation[]; tone: 'bull' | 'bear' }) {
  const intl = useAppIntl()
  if (!sources.length) return null
  return (
    <div className="asd-ki-sources">
      <span className={`asd-ki-sources-pill asd-ki-sources-pill--${tone}`}>
        {intl.formatMessage({ id: 'remaining.sources', defaultMessage: '{count, plural, one {# source} other {# sources}}' }, { count: sources.length })}
      </span>
      <span className="asd-ki-sources-links">
        {sources.map((src, i) => {
          const href = safeHref(src.url)
          const label = src.title || src.domain || src.url
          return href ? (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="asd-ki-source-link"
              title={label}
            >
              [{i + 1}]
            </a>
          ) : (
            <span key={i} className="asd-ki-source-link" title={label}>
              [{i + 1}]
            </span>
          )
        })}
      </span>
    </div>
  )
}

function IssueItem({ issue, defaultOpen }: { issue: KeyIssue; defaultOpen: boolean }) {
  const intl = useAppIntl()
  // Only the first issue starts expanded — the rest stay collapsed until clicked.
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="asd-ki-item">
      <button
        type="button"
        className="asd-ki-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="asd-ki-chevron" aria-hidden="true">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="asd-ki-question">{issue.question}</span>
      </button>
      {open && (
        <div className="asd-ki-body">
          <div className="asd-ki-col asd-ki-col--bull">
            <div className="asd-ki-col-head">
              {intl.formatMessage({ id: 'remaining.bullish', defaultMessage: 'Bullish view' })}
              <TrendingUp size={13} aria-hidden />
            </div>
            <p className="asd-ki-col-text">{issue.bullish.text}</p>
            <SourcesList sources={issue.bullish.sources} tone="bull" />
          </div>
          <div className="asd-ki-col asd-ki-col--bear">
            <div className="asd-ki-col-head">
              {intl.formatMessage({ id: 'remaining.bearish', defaultMessage: 'Bearish view' })}
              <TrendingDown size={13} aria-hidden />
            </div>
            <p className="asd-ki-col-text">{issue.bearish.text}</p>
            <SourcesList sources={issue.bearish.sources} tone="bear" />
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  issues: KeyIssue[]
}

export function KeyIssuesAccordion({ issues }: Props) {
  if (!issues.length) return null
  return (
    <div className="asd-ki-list">
      {issues.map((issue, i) => (
        <IssueItem key={i} issue={issue} defaultOpen={i === 0} />
      ))}
    </div>
  )
}
