import { defineMessages, type IntlShape } from 'react-intl'
import type { ReviewValidationCode } from './transactionReview'
import { useAppIntl } from '../../../i18n/useAppIntl'

const messages = defineMessages({
  date: { id: 'accounts.reviewValidation.date', defaultMessage: 'Choose a date.' },
  amount: { id: 'accounts.reviewValidation.amount', defaultMessage: 'Enter a valid amount.' },
  account: { id: 'accounts.reviewValidation.account', defaultMessage: 'Choose an active account.' },
  split: {
    id: 'accounts.reviewValidation.split',
    defaultMessage: 'Use Edit all details to change type, account, or split lines.',
  },
  destination: {
    id: 'accounts.reviewValidation.destination',
    defaultMessage: 'Choose an active destination account.',
  },
  distinct: {
    id: 'accounts.reviewValidation.distinct',
    defaultMessage: 'Transfers need two different accounts.',
  },
  received: {
    id: 'accounts.reviewValidation.received',
    defaultMessage: 'Enter the received amount.',
  },
  direction: {
    id: 'accounts.reviewValidation.direction',
    defaultMessage: 'Choose whether this investment is a buy or sell.',
  },
  originalBoth: {
    id: 'accounts.reviewValidation.originalBoth',
    defaultMessage: 'Original charge needs both an amount and currency.',
  },
  originalAmount: {
    id: 'accounts.reviewValidation.originalAmount',
    defaultMessage: 'Enter a valid original charge amount.',
  },
  originalCurrency: {
    id: 'accounts.reviewValidation.originalCurrency',
    defaultMessage: 'Choose a supported original currency.',
  },
  differentCurrency: {
    id: 'accounts.reviewValidation.differentCurrency',
    defaultMessage: 'Original currency must differ from the account currency.',
  },
})

export function formatReviewValidation(intl: IntlShape, code: ReviewValidationCode): string {
  return intl.formatMessage(messages[code])
}

export function useReviewValidation(error: ReviewValidationCode | null): string | null {
  const intl = useAppIntl()
  return error ? formatReviewValidation(intl, error) : null
}
