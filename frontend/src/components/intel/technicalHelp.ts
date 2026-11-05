import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'

const help = defineMessages({
  sma_50: { id: "intel.technical.help.sma_50", defaultMessage: "Average of the last 50 daily closes. Price above it scores toward Buy; below toward Sell. Full scale at \u00b15%." },
  sma_200: { id: "intel.technical.help.sma_200", defaultMessage: "Average of the last 200 daily closes \u2014 the long trend line. Same idea as SMA 50, but full scale at \u00b110% because this average moves slower." },
  sma_50_200: { id: "intel.technical.help.sma_50_200", defaultMessage: "Compares the 50-day average to the 200-day. When the 50 is above the 200 (a 'golden cross' regime), the marker leans Buy; the reverse ('death cross') leans Sell. Strength is how far apart they are, not just which is on top." },
  macd: { id: "intel.technical.help.macd", defaultMessage: "MACD is the gap between a fast and slow exponential average; the histogram is that line minus its signal line. Positive histogram \u2192 Buy side; negative \u2192 Sell. Magnitude is relative to price (full scale at 0.5% of the last close)." },
  rsi: { id: "intel.technical.help.rsi", defaultMessage: "Relative Strength Index over 14 days \u2014 how stretched recent gains or losses are. 50 is mid-track. High RSI (e.g. 70+) leans Sell (overbought); low RSI leans Buy (oversold). Continuous, not a hard 30/70 switch." },
  bollinger: { id: "intel.technical.help.bollinger", defaultMessage: "Where price sits between the upper and lower Bollinger bands (20-day average \u00b1 two standard deviations). At the lower band (%B 0) \u2192 Buy end; mid \u2192 Neutral; upper band (%B 1) \u2192 Sell end. Same stretch idea as RSI, from the band's width." },
})

export function technicalHelp(id: string, fallback: string, intl: IntlShape): string {
  if (!Object.hasOwn(help, id)) return fallback
  return intl.formatMessage(help[id as keyof typeof help] as MessageDescriptor)
}
