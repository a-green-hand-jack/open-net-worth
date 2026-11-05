// Settings → Duplicate Detection. Ported from the DedupSection in
// design_handoffs/settings_handoff/prototype/redesign/settings.jsx.
//
// Two panels: the engine's configuration, then the pairs it has already ruled on. The engine
// skips re-flagging what it has decided, so forgetting a decision is how you make it look again.
import { useState } from 'react'
import { defineMessages, type IntlShape } from 'react-intl'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import {
  forgetMatchDecision,
  getDedupConfig,
  listMatchDecisions,
  setDedupConfig,
} from '../../../../api/matches'
import type {
  DedupConfig,
  DedupPolicy,
  MatchDecision,
  MatchDecisionsResponse,
} from '../../../../api/matches'
import { useModels } from '../../../../hooks/useModels'
import { useCachedFetchState } from '../../../../state/queryCache'
import { fDate } from '../../../../utils/format'
import { ModelPicker } from '../../../ui'
import { Btn, Field, Panel, Select, Toggle, row, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'

const POLICY_LABELS = defineMessages({
  review_all: {
    id: 'dedupSettings.policy.conservative',
    defaultMessage: 'Conservative — ask on ambiguity',
  },
  auto_transfers: {
    id: 'dedupSettings.policy.balanced',
    defaultMessage: 'Balanced — auto-merge transfers',
  },
  auto_high: {
    id: 'dedupSettings.policy.aggressive',
    defaultMessage: 'Aggressive — merge likely dupes',
  },
})
const VERDICT_LABELS = defineMessages({
  same: { id: 'dedupSettings.verdict.same', defaultMessage: 'Merged' },
  different: { id: 'dedupSettings.verdict.different', defaultMessage: 'Not duplicates' },
  pair: { id: 'dedupSettings.verdict.pair', defaultMessage: 'Linked as a transfer' },
})
function decisionLine(d: MatchDecision, intl: IntlShape): string {
  const payee =
    d.payee_label ||
    intl.formatMessage({ id: 'dedupSettings.unlabelled', defaultMessage: 'Unlabelled pair' })
  const amount = d.amount_bucket ? ' • ' + d.amount_bucket : ''
  const outcome =
    d.verdict === 'same'
      ? intl.formatMessage({ id: 'dedupSettings.outcome.merged', defaultMessage: ' — merged' })
      : d.verdict === 'pair'
        ? intl.formatMessage({ id: 'dedupSettings.outcome.linked', defaultMessage: ' — linked' })
        : intl.formatMessage({ id: 'dedupSettings.outcome.kept', defaultMessage: ' — kept both' })
  return payee + amount + outcome
}

export function DedupSection({ toast }: SectionProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const {
    data: cfg,
    initialLoading: loadingCfg,
    refresh: refreshCfg,
  } = useCachedFetchState<DedupConfig>('/api/matches/config', getDedupConfig, { staleTime: 0 })
  useSectionBusy(loadingCfg && !cfg)
  const decisionsKey = '/api/matches/decisions?limit=50'
  const { data: decisions, refresh: refreshDecisions } =
    useCachedFetchState<MatchDecisionsResponse>(decisionsKey, () => listMatchDecisions(50), {
      staleTime: 0,
    })
  const { models, defaultModel } = useModels(true)
  const [busy, setBusy] = useState(false)

  const patch = async (
    p: Partial<Pick<DedupConfig, 'policy' | 'l3_enabled' | 'l3_model' | 'l3_max_per_run'>>,
    message: string,
  ) => {
    setBusy(true)
    try {
      await setDedupConfig(p)
      void refreshCfg()
      toast(message)
    } catch {
      toast(
        formatMessage({
          id: 'dedupSettings.CouldNotSaveTryAgain',
          defaultMessage: 'Could not save — try again',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  const forget = async (signature: string) => {
    try {
      await forgetMatchDecision(signature)
      void refreshDecisions()
      toast(
        formatMessage({
          id: 'dedupSettings.DecisionForgottenPairWillBeReEvaluated',
          defaultMessage: 'Decision forgotten — pair will be re-evaluated',
        }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'dedupSettings.CouldNotForgetThatDecision',
          defaultMessage: 'Could not forget that decision',
        }),
      )
    }
  }

  const policyOptions = (cfg?.policy_options ??
    (Object.keys(POLICY_LABELS) as DedupPolicy[])) as DedupPolicy[]
  const rows = decisions?.decisions ?? []

  return (
    <>
      <Panel
        title={formatMessage({
          id: 'dedupSettings.EngineConfiguration',
          defaultMessage: 'Engine configuration',
        })}
        sub={formatMessage({
          id: 'dedupSettings.HowImportedTransactionsAreMatchedAgainstWhatSAlreadyInTheLedger',
          defaultMessage:
            "How imported transactions are matched against what's already in the ledger",
        })}
      >
        <div className="rd-formgrid">
          <Field
            label={formatMessage({
              id: 'dedupSettings.AutoMergePolicy',
              defaultMessage: 'Auto-merge policy',
            })}
            help={formatMessage({
              id: 'dedupSettings.ConservativeAsksBeforeMergingAnythingAmbiguous',
              defaultMessage: 'Conservative asks before merging anything ambiguous',
            })}
          >
            <Select
              aria-label={formatMessage({
                id: 'dedupSettings.AutoMergePolicy',
                defaultMessage: 'Auto-merge policy',
              })}
              value={cfg?.policy ?? 'auto_transfers'}
              disabled={busy || !cfg}
              onChange={(e) =>
                void patch(
                  { policy: e.target.value as DedupPolicy },
                  formatMessage({
                    id: 'dedupSettings.AutoMergePolicyUpdated',
                    defaultMessage: 'Auto-merge policy updated',
                  }),
                )
              }
            >
              {policyOptions.map((p) => (
                <option key={p} value={p}>
                  {POLICY_LABELS[p] ? formatMessage(POLICY_LABELS[p]) : p}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={formatMessage({
              id: 'dedupSettings.JudgmentModel',
              defaultMessage: 'Judgment model',
            })}
            help={formatMessage({
              id: 'dedupSettings.WhichModelRulesOnALookalikePairCheapModelsAreUsuallyEnough',
              defaultMessage:
                'Which model rules on a lookalike pair. Cheap models are usually enough.',
            })}
          >
            <ModelPicker
              label={formatMessage({
                id: 'dedupSettings.JudgmentModel',
                defaultMessage: 'Judgment model',
              })}
              models={models}
              value={cfg?.l3_model ?? ''}
              defaultLabel={formatMessage({
                id: 'dedupSettings.Default',
                defaultMessage: 'Default',
              })}
              defaultModelId={defaultModel}
              disabled={busy || !cfg}
              onChange={(next) =>
                void patch(
                  { l3_model: next },
                  formatMessage({
                    id: 'dedupSettings.JudgmentModelUpdated',
                    defaultMessage: 'Judgment model updated',
                  }),
                )
              }
            />
          </Field>
          <Field
            label={formatMessage({
              id: 'dedupSettings.MaxAiChecksPerRun',
              defaultMessage: 'Max AI checks per run',
            })}
            help={formatMessage({
              id: 'dedupSettings.CapsTheSpendOnOneImportPairsBeyondThisAreLeftForYouToReview',
              defaultMessage:
                'Caps the spend on one import — pairs beyond this are left for you to review.',
            })}
          >
            <input
              className="rd-input"
              type="number"
              min={0}
              defaultValue={cfg?.l3_max_per_run ?? 0}
              key={cfg?.l3_max_per_run ?? 'na'}
              onBlur={(e) => {
                const next = Number(e.target.value)
                if (!Number.isFinite(next) || next < 0 || next === cfg?.l3_max_per_run) return
                void patch(
                  { l3_max_per_run: next },
                  formatMessage({
                    id: 'dedupSettings.CheckLimitUpdated',
                    defaultMessage: 'Check limit updated',
                  }),
                )
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          </Field>
        </div>
        {row(
          formatMessage({
            id: 'dedupSettings.UseAiToJudgeAmbiguousDuplicates',
            defaultMessage: 'Use AI to judge ambiguous duplicates',
          }),
          formatMessage({
            id: 'dedupSettings.ExactMatchPairsNeverNeedAiThisCoversSameDaySameAmountLookalikes',
            defaultMessage:
              'Exact-match pairs never need AI; this covers same-day/same-amount lookalikes.',
          }),
          <Toggle
            on={cfg?.l3_enabled ?? false}
            disabled={busy || !cfg}
            onChange={(v) =>
              void patch(
                { l3_enabled: v },
                v
                  ? formatMessage({
                      id: 'dedupSettings.AiJudgmentEnabled',
                      defaultMessage: 'AI judgment enabled',
                    })
                  : formatMessage({
                      id: 'dedupSettings.AiJudgmentDisabled',
                      defaultMessage: 'AI judgment disabled',
                    }),
              )
            }
            label={formatMessage({ id: 'dedupSettings.AiJudge', defaultMessage: 'AI judge' })}
          />,
        )}
      </Panel>

      <Panel
        title={formatMessage({
          id: 'dedupSettings.RememberedDecisions',
          defaultMessage: 'Remembered decisions',
        })}
        sub={formatMessage({
          id: 'dedupSettings.TheEngineSkipsReFlaggingPairsItHasAlreadyDecidedOnForgetADecisionToLetTheEngineReEvaluateThatPair',
          defaultMessage:
            'The engine skips re-flagging pairs it has already decided on. Forget a decision to let the engine re-evaluate that pair.',
        })}
        flush
      >
        {rows.length ? (
          rows.map((d) => (
            <div className="rd-row" key={d.signature}>
              <div className="rd-row-main">
                <div className="rd-row-sub" style={{ color: 'var(--ink)' }}>
                  {decisionLine(d, intl)}
                </div>
                <div className="rd-row-meta">
                  <span>{formatMessage(VERDICT_LABELS[d.verdict])}</span>
                  <span>{fDate(d.created_at, 'short', 'always')}</span>
                </div>
              </div>
              <div className="rd-row-actions">
                <Btn size="xs" variant="ghost" onClick={() => void forget(d.signature)}>
                  {formatMessage({ id: 'dedupSettings.Forget', defaultMessage: 'Forget' })}
                </Btn>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '14px 18px' }}>
            <span className="rd-help">
              {formatMessage({
                id: 'dedupSettings.NothingDecidedYetTheEngineRecordsADecisionTheFirstTimeItRulesOnALookalikePair',
                defaultMessage:
                  'Nothing decided yet — the engine records a decision the first time it rules on a lookalike pair.',
              })}
            </span>
          </div>
        )}
      </Panel>
    </>
  )
}
