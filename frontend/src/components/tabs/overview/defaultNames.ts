import type { IntlShape } from 'react-intl'
import type { DashboardView, SectionDivider } from './types'

export function displayViewName(intl: IntlShape, view: DashboardView): string {
  const { formatMessage } = intl
  switch (view.nameSource) {
    case 'preset_overview':
      return formatMessage({ id: 'overview.defaultView.overview', defaultMessage: 'Overview' })
    case 'preset_investing':
      return formatMessage({ id: 'overview.defaultView.investing', defaultMessage: 'Investing' })
    case 'preset_cash_flow':
      return formatMessage({ id: 'overview.defaultView.cashFlow', defaultMessage: 'Cash flow' })
    case 'preset_plan':
      return formatMessage({ id: 'overview.defaultView.plan', defaultMessage: 'Plan' })
    case 'preset_reports':
      return formatMessage({ id: 'overview.defaultView.reports', defaultMessage: 'Reports' })
    case 'default_view':
      return formatMessage({ id: 'overview.defaultView.new', defaultMessage: 'New view' })
    default:
      return view.name
  }
}

export function displaySectionTitle(intl: IntlShape, section: SectionDivider): string {
  return section.titleSource === 'default_section'
    ? intl.formatMessage({ id: 'overview.defaultSection', defaultMessage: 'Section' })
    : section.title
}
