import { useAppIntl } from '../../../../i18n/useAppIntl'
// Settings → Security, Private Cloud only: who is signed in, the way back to the portal, and the
// two ways to sign out.
import { useState } from 'react'
import { useGatewayIdentity } from '../../../../hooks/useGatewayIdentity'
import { signOutOfGateway, type SignOutScope } from '../../../../utils/gatewaySignOut'
import { Btn, Panel, row } from '../ds'
import { ConfirmDialog } from '../../../ui/ConfirmDialog'

export function GatewayAccountPanel() {
  const { formatMessage } = useAppIntl()
  const signOut = {
    app: {
      label: formatMessage({
        id: 'settings.remaining.signOutApp',
        defaultMessage: 'Sign out of this app',
      }),
      title: formatMessage({
        id: 'settings.remaining.signOutAppTitle',
        defaultMessage: 'Sign out of this app?',
      }),
      body: formatMessage({
        id: 'settings.remaining.signOutAppHelp',
        defaultMessage:
          'You will be taken to your Private Cloud portal. You stay signed in to the portal.',
      }),
    },
    everywhere: {
      label: formatMessage({
        id: 'settings.remaining.signOutEverywhere',
        defaultMessage: 'Sign out everywhere',
      }),
      title: formatMessage({
        id: 'settings.remaining.signOutEverywhereTitle',
        defaultMessage: 'Sign out everywhere?',
      }),
      body: formatMessage({
        id: 'settings.remaining.signOutEverywhereHelp',
        defaultMessage:
          'This signs you out of the app and the Private Cloud portal, on this device and your other browsers.',
      }),
    },
  }
  const identity = useGatewayIdentity(true)
  const [confirming, setConfirming] = useState<SignOutScope | null>(null)
  const copy = confirming ? signOut[confirming] : null

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.cloudAccount',
        defaultMessage: 'Private Cloud account',
      })}
      sub={formatMessage({
        id: 'settings.remaining.cloudHelp',
        defaultMessage: 'You sign in to this app through your Private Cloud account',
      })}
    >
      {row(
        formatMessage({ id: 'settings.remaining.signedAs', defaultMessage: 'Signed in as' }),
        identity?.portal_url
          ? formatMessage({
              id: 'settings.remaining.portalHelp',
              defaultMessage: 'Billing, version and account settings live in the portal.',
            })
          : undefined,
        <span className="rd-gw-identity">
          {identity?.email ?? '…'}
          {identity?.portal_url && (
            <>
              {' · '}
              <a href={identity.portal_url} target="_blank" rel="noopener noreferrer">
                {formatMessage({
                  id: 'settings.remaining.portal',
                  defaultMessage: 'Private Cloud portal',
                })}
              </a>
            </>
          )}
        </span>,
        { className: 'rd-gw-identity-row' },
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn onClick={() => setConfirming('app')}>{signOut.app.label}</Btn>
        <Btn variant="danger" onClick={() => setConfirming('everywhere')}>
          {signOut.everywhere.label}
        </Btn>
      </div>
      <ConfirmDialog
        data={
          copy && confirming
            ? {
                title: copy.title,
                body: copy.body,
                confirmLabel: formatMessage({
                  id: 'settings.remaining.signOut',
                  defaultMessage: 'Sign out',
                }),
                danger: true,
              }
            : null
        }
        onConfirm={() => confirming && signOutOfGateway(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </Panel>
  )
}
