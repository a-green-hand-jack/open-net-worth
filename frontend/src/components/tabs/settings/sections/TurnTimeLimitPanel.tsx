import { useAppIntl } from '../../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
// Settings → AI Models → Turn time limit. A slow model provider can take minutes per call, so
// how long a chat reply or an Automation run may take is the owner's call, up to no limit.
import {
  TURN_TIME_LIMIT_KEY,
  getTurnTimeLimit,
  setTurnTimeLimit,
} from '../../../../api/turnTimeLimit'
import type { TurnTimeLimit } from '../../../../api/turnTimeLimit'
import { setCachedQueryData, useCachedFetchState } from '../../../../state/queryCache'
import { Field, Panel, Select } from '../ds'
import type { SectionProps } from '../ds'

export function TurnTimeLimitPanel({ toast }: Pick<SectionProps, 'toast'>) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const { data: loaded, error } = useCachedFetchState<TurnTimeLimit>(
    TURN_TIME_LIMIT_KEY,
    getTurnTimeLimit,
    {
      staleTime: 0,
    },
  )

  // Anything without the choices list (an older server, a stub) counts as not loaded.
  const data = Array.isArray(loaded?.choices) ? loaded : undefined

  // Optimistic: the pick shows at once; only a failed save puts the old value back.
  const save = async (seconds: number) => {
    if (!data) return
    const before = data
    setCachedQueryData<TurnTimeLimit>(TURN_TIME_LIMIT_KEY, { ...before, seconds })
    try {
      await setTurnTimeLimit(seconds)
      toast(
        formatMessage(
          { id: 'settings.remaining.timeSaved', defaultMessage: 'Turn time limit: {limit}' },
          { limit: timeLabel(intl, seconds) },
        ),
      )
    } catch {
      setCachedQueryData<TurnTimeLimit>(TURN_TIME_LIMIT_KEY, before)
      toast(
        formatMessage(
          {
            id: 'settings.remaining.timeSaveFailed',
            defaultMessage: 'Could not save — still {limit}',
          },
          { limit: timeLabel(intl, before.seconds) },
        ),
      )
    }
  }

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.timeTitle',
        defaultMessage: 'Turn time limit',
      })}
      sub={formatMessage({
        id: 'settings.remaining.timeSub',
        defaultMessage:
          'How long Lucius may work on one reply or Automation run before it is stopped',
      })}
    >
      <div className="rd-formgrid">
        <Field
          label={formatMessage({
            id: 'settings.remaining.timeAfter',
            defaultMessage: 'Stop a turn after',
          })}
          help={formatMessage({
            id: 'settings.remaining.timeHelp',
            defaultMessage:
              'Raise this if a slow model keeps getting stopped mid-task. With no limit, a turn runs until it finishes or you press Stop.',
          })}
        >
          {data ? (
            <Select
              value={String(data.seconds)}
              onChange={(e) => void save(Number(e.target.value))}
            >
              {data.choices.map((s) => (
                <option key={s} value={String(s)}>
                  {timeLabel(intl, s, data.default_seconds)}
                </option>
              ))}
            </Select>
          ) : (
            <span className="rd-help">
              {error
                ? formatMessage({
                    id: 'settings.remaining.timeLoadError',
                    defaultMessage: 'Couldn’t load — reload the page',
                  })
                : formatMessage({ id: 'settings.remaining.loading', defaultMessage: 'Loading…' })}
            </span>
          )}
        </Field>
      </div>
    </Panel>
  )
}

function timeLabel(intl: IntlShape, seconds: number, defaultSeconds?: number): string {
  if (seconds <= 0)
    return intl.formatMessage({ id: 'settings.remaining.noLimit', defaultMessage: 'No limit' })
  const minutes = Math.round(seconds / 60)
  const duration =
    minutes >= 60 && minutes % 60 === 0
      ? intl.formatMessage(
          {
            id: 'settings.remaining.hours',
            defaultMessage: '{count, plural, one {# hour} other {# hours}}',
          },
          { count: minutes / 60 },
        )
      : intl.formatMessage(
          {
            id: 'settings.remaining.minutes',
            defaultMessage: '{count, plural, one {# minute} other {# minutes}}',
          },
          { count: minutes },
        )
  return seconds === defaultSeconds
    ? intl.formatMessage(
        { id: 'settings.remaining.defaultDuration', defaultMessage: '{duration} (default)' },
        { duration },
      )
    : duration
}
