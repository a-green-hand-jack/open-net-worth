import type { ComponentProps } from 'react'
import { useFlag } from '../../../hooks/useFlag'
import { TabSkeleton } from '../../ui'
import { AutomationDetail } from './AutomationDetail'
import { AutomationDetailV2 } from './AutomationDetailV2'
import { useAppIntl } from '../../../i18n/useAppIntl'

type OldDetailProps = ComponentProps<typeof AutomationDetail>
type NewDetailProps = ComponentProps<typeof AutomationDetailV2>

/** The Automation page's ONE switch point for `permissions_v2`: the old "Always allowed" list
 * with Revoke, or the Tool permissions section (Always allowed and Blocked, per tool). The page
 * hands both handlers; each version takes the one it knows. */
export function AutomationDetailSwitch(
  props: OldDetailProps & Pick<NewDetailProps, 'onSaveToolLists'>,
) {
  const { formatMessage } = useAppIntl()
  const v2 = useFlag('permissions_v2')
  if (v2 === undefined) {
    return (
      <TabSkeleton
        variant="automations"
        label={formatMessage({
          id: 'automations.loadingOne',
          defaultMessage: 'Loading automation…',
        })}
        header={false}
      />
    )
  }
  const { onRevoke, onSaveToolLists, ...shared } = props
  return v2 ? (
    <AutomationDetailV2 {...shared} onSaveToolLists={onSaveToolLists} />
  ) : (
    <AutomationDetail {...shared} onRevoke={onRevoke} />
  )
}
