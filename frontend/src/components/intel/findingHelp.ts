import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'

const messages = defineMessages({
  big_move: { id: "intel.finding.help.big_move", defaultMessage: "A day move measured against this stock’s own usual daily swing over the last 60 trading days — 2× usual is worth a look, 3× is unusual. A calm stock can be flagged at 2%; a volatile one isn’t flagged at 6%. Without enough history: 5% for a stock, 6% commodity, 10% crypto." },
  company_move: { id: "intel.finding.help.company_move", defaultMessage: "The market (your benchmark, scaled by how much this stock usually moves with it) doesn’t explain today’s move — something about the company does." },
  market_move: { id: "intel.finding.help.market_move", defaultMessage: "Mostly the market: the stock moved about as much as it usually does when your benchmark moves like this." },
  sector_move: { id: "intel.finding.help.sector_move", defaultMessage: "Moving with its sector — its sector fund moved about as much today." },
  drawdown: { id: "intel.finding.help.drawdown", defaultMessage: "Down this far from its highest close of the last 20 trading days — deeper than this stock’s usual swings would explain." },
  streak: { id: "intel.finding.help.streak", defaultMessage: "Several days in a row in the same direction, with the total change over the run." },
  momentum: { id: "intel.finding.help.momentum", defaultMessage: "This month’s change compared with your benchmark’s — a gap bigger than this stock’s usual monthly swing." },
  crossed_200d: { id: "intel.finding.help.crossed_200d", defaultMessage: "Crossed its 200-day average in the last few sessions — still news for a few days, not just the day it happened." },
  possible_split: { id: "intel.finding.help.possible_split", defaultMessage: "Today’s change matches a stock split (for example 4-for-1 → −75%) on ordinary volume, so price-based flags are paused — the price feed has adjusted, not crashed." },
  entered_buy_zone: { id: "intel.finding.help.entered_buy_zone", defaultMessage: "The price just moved into the buy zone you set for this ticker." },
  in_buy_zone: { id: "intel.finding.help.in_buy_zone", defaultMessage: "The price is inside the buy zone you set." },
  crossed_below_fair_value: { id: "intel.finding.help.crossed_below_fair_value", defaultMessage: "The price just fell 10% or more below the fair value you set." },
  below_fair_value: { id: "intel.finding.help.below_fair_value", defaultMessage: "The price is 10% or more below the fair value you set." },
  above_fair_value: { id: "intel.finding.help.above_fair_value", defaultMessage: "The price is 10% or more above the fair value you set." },
  breakout: { id: "intel.finding.help.breakout", defaultMessage: "Trading at its highest price of the past 52 weeks." },
  near_high: { id: "intel.finding.help.near_high", defaultMessage: "Within 2% of its 52-week high." },
  breakdown: { id: "intel.finding.help.breakdown", defaultMessage: "Trading at its lowest price of the past 52 weeks." },
  near_low: { id: "intel.finding.help.near_low", defaultMessage: "Within 3% of its 52-week low." },
  discount: { id: "intel.finding.help.discount", defaultMessage: "25% or more below its 52-week high — a pullback worth knowing about, not a verdict." },
  reclaim_200d: { id: "intel.finding.help.reclaim_200d", defaultMessage: "Closed above its 200-day average after being below it — often read as a longer-term trend turning up." },
  lost_200d: { id: "intel.finding.help.lost_200d", defaultMessage: "Fell below its 200-day average after being above it — often read as a longer-term trend turning down." },
  reclaim_50d: { id: "intel.finding.help.reclaim_50d", defaultMessage: "Moved back above its 50-day average — a shorter-term trend turning up." },
  lost_50d: { id: "intel.finding.help.lost_50d", defaultMessage: "Dropped below its 50-day average — a shorter-term trend turning down." },
  volume: { id: "intel.finding.help.volume", defaultMessage: "Trading volume on pace for 2.5× or more a normal day — measured against how much normally trades by this time of the session, so a busy morning isn’t missed." },
  earnings_soon: { id: "intel.finding.help.earnings_soon", defaultMessage: "Reports earnings within a week. Prices often move sharply around the report." },
  alert_near: { id: "intel.finding.help.alert_near", defaultMessage: "Within 2% of one of your own price alerts." },
})

export function findingHelp(kind: string, fallback: string, intl: IntlShape): string {
  if (!Object.hasOwn(messages, kind)) return fallback
  return intl.formatMessage(messages[kind as keyof typeof messages] as MessageDescriptor)
}
