import type { IntlShape } from 'react-intl'
import type { ConversationMeta } from '../../hooks/useConversations'

/** Only a server-marked application placeholder is translated; user titles remain untouched. */
export function displayConversationTitle(
  conv: ConversationMeta | undefined,
  intl: IntlShape,
): string {
  if (!conv || conv.titleSource === 'placeholder') {
    return intl.formatMessage({ id: 'chat.newConversation', defaultMessage: 'New conversation' })
  }
  if (conv.titleSource === 'onboarding') {
    return intl.formatMessage({
      id: 'chat.onboardingTitle',
      defaultMessage: 'Onboarding to Open Net Worth',
    })
  }
  return conv.title
}
