import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const prompts = defineMessages({
  telegram_0: { id: "connectors.prompt.telegram_0", defaultMessage: "Send me a daily balance summary" },
  telegram_1: { id: "connectors.prompt.telegram_1", defaultMessage: "Notify me if any account drops below $500" },
  email_0: { id: "connectors.prompt.email_0", defaultMessage: "Reparse last month’s statements" },
  email_1: { id: "connectors.prompt.email_1", defaultMessage: "Send this week’s digest now" },
  plaid_0: { id: "connectors.prompt.plaid_0", defaultMessage: "Reconnect my bank account" },
  plaid_1: { id: "connectors.prompt.plaid_1", defaultMessage: "Show all accounts linked through Plaid" },
  lunch_flow_0: { id: "connectors.prompt.lunch_flow_0", defaultMessage: "Sync my Lunch Flow accounts now" },
  lunch_flow_1: { id: "connectors.prompt.lunch_flow_1", defaultMessage: "Show accounts linked through Lunch Flow" },
  enable_banking_0: { id: "connectors.prompt.enable_banking_0", defaultMessage: "Sync my EU bank accounts" },
  enable_banking_1: { id: "connectors.prompt.enable_banking_1", defaultMessage: "Show accounts linked through Enable Banking" },
  gocardless_0: { id: "connectors.prompt.gocardless_0", defaultMessage: "Fetch my GoCardless transactions" },
  gocardless_1: { id: "connectors.prompt.gocardless_1", defaultMessage: "Show accounts linked through GoCardless" },
  yodlee_0: { id: "connectors.prompt.yodlee_0", defaultMessage: "Sync my Yodlee accounts now" },
  yodlee_1: { id: "connectors.prompt.yodlee_1", defaultMessage: "Show all accounts linked through Yodlee" },
  alpaca_0: { id: "connectors.prompt.alpaca_0", defaultMessage: "Import my Alpaca positions" },
  alpaca_1: { id: "connectors.prompt.alpaca_1", defaultMessage: "Show my Alpaca cash balance" },
  ibkr_0: { id: "connectors.prompt.ibkr_0", defaultMessage: "Import today’s IBKR trades" },
  ibkr_1: { id: "connectors.prompt.ibkr_1", defaultMessage: "Show my IBKR cash balance" },
  web_search_0: { id: "connectors.prompt.web_search_0", defaultMessage: "Look up today’s SGD/USD rate" },
  web_search_1: { id: "connectors.prompt.web_search_1", defaultMessage: "Check if IRAS changed the GST rate" },
})

export function useConnectorPrompt() {
  const intl = useAppIntl()
  return (kind: string, index: number, fallback: string) => {
    const key = `${kind}_${index}`
    if (!Object.hasOwn(prompts, key)) return fallback
    const descriptor = prompts[key as keyof typeof prompts]
    return descriptor.defaultMessage === fallback && Object.hasOwn(intl.messages, descriptor.id) ? intl.formatMessage(descriptor) : fallback
  }
}
