import type { IntlShape } from 'react-intl'
import type { DashboardView } from './types'

export function displayViewName(intl: IntlShape, view: DashboardView): string {
  if (view.nameSource === 'preset_overview' && view.name === 'Overview')
    return intl.formatMessage({ id: 'overview.defaultView.overview', defaultMessage: 'Overview' })
  if (view.nameSource === 'preset_reports' && view.name === 'Reports')
    return intl.formatMessage({ id: 'overview.defaultView.reports', defaultMessage: 'Reports' })
  if (view.nameSource === 'default_view' && view.name === 'New view')
    return intl.formatMessage({ id: 'overview.defaultView.new', defaultMessage: 'New view' })
  return view.name
}
