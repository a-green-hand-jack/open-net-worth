import type { IntlShape } from 'react-intl'
import type { Installment } from '../../../types/commitments'
import { fmtDay } from '../../../utils/commitments'

type Source = NonNullable<Installment['description_source']>

function validSource(item: Installment): Source | null {
  const source = item.description_source
  if (
    !source ||
    typeof source !== 'object' ||
    Object.keys(source).length !== 2 ||
    typeof source.original !== 'string' ||
    !Array.isArray(source.moves) ||
    source.moves.length < 1
  )
    return null
  let text = source.original
  for (const move of source.moves) {
    if (
      !move ||
      typeof move !== 'object' ||
      Object.keys(move).length !== 2 ||
      typeof move.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(move.date) ||
      typeof move.rendered !== 'string' ||
      !move.rendered ||
      move.rendered.length > 80
    )
      return null
    text += (text ? ' · ' : '') + 'moved from ' + move.rendered
  }
  return text === item.description ? source : null
}

export function displayInstallmentDescription(item: Installment, intl: IntlShape): string {
  const source = validSource(item)
  if (!source || intl.locale.startsWith('en')) return item.description
  return [
    source.original,
    ...source.moves.map((move) =>
      intl.formatMessage(
        { id: 'commitments.schedule.movedFrom', defaultMessage: 'moved from {date}' },
        { date: fmtDay(move.date) },
      ),
    ),
  ]
    .filter(Boolean)
    .join(' · ')
}

export function rescheduledDescription(
  item: Installment,
): Pick<Installment, 'description' | 'description_source'> {
  const source = validSource(item) || { original: item.description || '', moves: [] }
  const rendered = fmtDay(item.due_date)
  const description = (item.description ? item.description + ' · ' : '') + 'moved from ' + rendered
  return {
    description,
    description_source: {
      original: source.original,
      moves: [...source.moves, { date: item.due_date, rendered }],
    },
  }
}
