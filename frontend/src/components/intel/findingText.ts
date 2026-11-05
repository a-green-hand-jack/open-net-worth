import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'
import type { WatchFinding } from '../../types/watchPulse'

const messages = defineMessages({
  move: { id: "watchPulse.move", defaultMessage: "{direction, select, up {Up} other {Down}} {percent}% today" },
  move_with_benchmark: { id: "watchPulse.move_with_benchmark", defaultMessage: "{direction, select, up {Up} other {Down}} {percent}% today, {gap} pts {relative, select, ahead {ahead of} other {behind}} {comparison}" },
  scored_move: { id: "watchPulse.scored_move", defaultMessage: "{direction, select, up {Up} other {Down}} {percent}% today — {multiple}× its usual daily move" },
  company_move: { id: "watchPulse.company_move", defaultMessage: "Company-specific — {market, select, known {{comparison}} other {the market}}" },
  market_move: { id: "watchPulse.market_move", defaultMessage: "Mostly the market — {market, select, known {{comparison}} other {the market}}" },
  sector_move: { id: "watchPulse.sector_move", defaultMessage: "Moving with its sector — {symbol} {percent}%" },
  drawdown: { id: "watchPulse.drawdown", defaultMessage: "Down {percent}% from its 20-day high" },
  streak: { id: "watchPulse.streak", defaultMessage: "{days} {direction, select, up {up} other {down}} days in a row ({percent}%)" },
  momentum: { id: "watchPulse.momentum", defaultMessage: "{direction, select, up {Up} other {Down}} {percent}% this month, {gap} pts {relative, select, ahead {ahead of} other {behind}} {symbol}" },
  crossed_200d: { id: "watchPulse.crossed_200d", defaultMessage: "Crossed {direction, select, up {above} other {below}} its 200-day average {days, plural, =1 {yesterday} other {# days ago}}" },
  breakout: { id: "watchPulse.breakout", defaultMessage: "At a 52-week high" },
  breakdown: { id: "watchPulse.breakdown", defaultMessage: "At a 52-week low" },
  below_high: { id: "watchPulse.below_high", defaultMessage: "{percent}% below its 52-week high" },
  above_low: { id: "watchPulse.above_low", defaultMessage: "{percent}% above its 52-week low" },
  reclaim_average: { id: "watchPulse.reclaim_average", defaultMessage: "Reclaimed its {days}-day average" },
  lost_average: { id: "watchPulse.lost_average", defaultMessage: "Fell below its {days}-day average" },
  volume_pace: { id: "watchPulse.volume_pace", defaultMessage: "Volume on pace for {pace}× a normal day" },
  volume_average: { id: "watchPulse.volume_average", defaultMessage: "Volume {pace}× its 3-month average" },
  earnings: { id: "watchPulse.earnings", defaultMessage: "Earnings {days, plural, =0 {today} =1 {tomorrow} other {in # days}}{thesis, select, yes { — check your thesis} other {}}" },
  alert_near: { id: "watchPulse.alert_near", defaultMessage: "{percent}% {side, select, above {above} other {below}} your {level} alert" },
  possible_split: { id: "watchPulse.possible_split", defaultMessage: "{percent}% looks like a stock split — prices may be adjusting" },
  entered_buy_zone: { id: "watchPulse.entered_buy_zone", defaultMessage: "Entered your buy zone ({zone})" },
  in_buy_zone: { id: "watchPulse.in_buy_zone", defaultMessage: "In your buy zone ({zone})" },
  below_fair: { id: "watchPulse.below_fair", defaultMessage: "{percent}% below your fair value of {level}" },
  above_fair: { id: "watchPulse.above_fair", defaultMessage: "{percent}% above your fair value of {level}" },
  at_stop: { id: "watchPulse.at_stop", defaultMessage: "At or below your stop of {level}" },
  above_trim: { id: "watchPulse.above_trim", defaultMessage: "At or above your trim level of {level}" },
  near_trim: { id: "watchPulse.near_trim", defaultMessage: "{percent}% under your trim level of {level}" },
  near_fair: { id: "watchPulse.near_fair", defaultMessage: "{percent}% under your fair value of {level}" },
})

export const requiredParams: Record<string, string[]> = {"move": ["direction", "percent"], "move_with_benchmark": ["comparison", "direction", "gap", "percent", "relative"], "scored_move": ["direction", "multiple", "percent"], "company_move": ["comparison", "market"], "market_move": ["comparison", "market"], "sector_move": ["percent", "symbol"], "drawdown": ["percent"], "streak": ["days", "direction", "percent"], "momentum": ["direction", "gap", "percent", "relative", "symbol"], "crossed_200d": ["days", "direction"], "breakout": [], "breakdown": [], "below_high": ["percent"], "above_low": ["percent"], "reclaim_average": ["days"], "lost_average": ["days"], "volume_pace": ["pace"], "volume_average": ["pace"], "earnings": ["days", "thesis"], "alert_near": ["level", "percent", "side"], "possible_split": ["percent"], "entered_buy_zone": ["zone"], "in_buy_zone": ["zone"], "below_fair": ["level", "percent"], "above_fair": ["level", "percent"], "at_stop": ["level"], "above_trim": ["level"], "near_trim": ["level", "percent"], "near_fair": ["level", "percent"]}

export function findingText(finding: WatchFinding, intl: IntlShape): string {
  if (intl.locale.toLowerCase().startsWith('en')) return finding.text
  const message = finding.text_message
  if (!message || typeof message.id !== 'string' || !message.id.startsWith('watchPulse.')) return finding.text
  const key = message.id.slice('watchPulse.'.length)
  if (!Object.hasOwn(messages, key) || !message.params || typeof message.params !== 'object' || Array.isArray(message.params)) return finding.text
  if (requiredParams[key]!.some(name => typeof message.params[name] !== 'string' && typeof message.params[name] !== 'number')) return finding.text
  try {
    return intl.formatMessage(messages[key as keyof typeof messages] as MessageDescriptor, message.params)
  } catch { return finding.text }
}
