// Cross-tab Portfolio Brief signal aggregator (Wave 2, RFC 09-cross-tab).
//
// Thin fetch wrapper — all signal computation has moved to the backend
// (GET /api/investments/brief). This hook fetches and maps the response.
//
// The Investments brief and the Dashboard's Needs attention both read it, so an open decision
// is the same decision on both.
//
// On any error the hook degrades silently to the on-track fallback.

import { authFetch } from '../api/client'
import { useMemo } from 'react'
import { useQueryCache } from '../state/queryCache'
import type { InvestmentSignal } from '../types/investmentSignals'
import { useAppIntl } from '../i18n/useAppIntl'
import { portfolioMessage } from './portfolioMessages'

export interface SignalsResult {
  signals: InvestmentSignal[]
  decisionsCount: number
  loading: boolean
}

// On-track fallback — emitted when fetch fails or backend returns empty.
const ONTRACK: InvestmentSignal = {
  id: 'ontrack',
  kind: 'ontrack',
  tone: 'good',
  actionable: false,
  appFallback: true,
  tag: 'On track',
  narrative: 'Your portfolio is within guidelines. No rebalancing or concentration alerts.',
}

export function useInvestmentSignals(): SignalsResult {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const query = useQueryCache<Omit<SignalsResult, 'loading'>>(
    '/api/investments/brief',
    async () => {
      const response = await authFetch('/api/investments/brief')
      const data = response.ok ? await response.json() : null
      if (!data || !Array.isArray(data.signals)) {
        return { signals: [ONTRACK], decisionsCount: 0 }
      }
      return {
        signals: data.signals as InvestmentSignal[],
        decisionsCount: data.decisions_count ?? 0,
      }
    },
    { staleTime: 0 },
  )
  const fallback = useMemo(
    () => ({
      ...ONTRACK,
      tag: formatMessage({ id: 'investments.brief.onTrack', defaultMessage: 'On track' }),
      narrative: formatMessage({
        id: 'investments.brief.onTrackBody',
        defaultMessage:
          'Your portfolio is within guidelines. No rebalancing or concentration alerts.',
      }),
    }),
    [formatMessage],
  )
  const signals = useMemo(
    () =>
      query.data?.signals.map((s) =>
        s.appFallback === true
          ? fallback
          : {
              ...s,
              tag: portfolioMessage(intl, s.tag_message, s.tag),
              narrative: portfolioMessage(intl, s.narrative_message, s.narrative),
            },
      ),
    [query.data?.signals, fallback, intl],
  )
  if (query.data)
    return {
      ...query.data,
      signals: signals ?? [],
      loading: false,
    }
  if (query.error) return { signals: [fallback], decisionsCount: 0, loading: false }
  return { signals: [], decisionsCount: 0, loading: true }
}
