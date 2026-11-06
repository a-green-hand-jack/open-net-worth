import { useAppIntl } from '../../i18n/useAppIntl'
import { ArrowUpDown, ChevronDown } from '../../ui/icons'
import { PULSE_SORTS, isPulseSort, type PulseSort } from './pulseHelp'

// The pulse list's sort, shaped like the toolbar buttons beside it (Mark all read, Archive) with
// a sort icon and a chevron, so it reads as a menu. The control itself stays a native <select>:
// keyboard, screen readers and the phone's own picker all keep working.
export function PulseSortMenu({
  value,
  onChange,
}: {
  value: PulseSort
  onChange: (next: PulseSort) => void
}) {
  const intl = useAppIntl()
  return (
    <span className="intel-sort">
      <ArrowUpDown size={13} className="intel-sort-icon" aria-hidden="true" />
      <select
        className="intel-sort-select"
        aria-label={intl.formatMessage({ id: "intel.field.56d8a936", defaultMessage: "Sort the list" })}
        value={value}
        onChange={(e) => {
          if (isPulseSort(e.target.value)) onChange(e.target.value)
        }}
      >
        {PULSE_SORTS.map((o) => (
          <option key={o.value} value={o.value}>
            {intl.formatMessage({ id: 'intel.pulse.sort', defaultMessage: '{kind, select, attention {Most urgent} today {Biggest move today} trend {Most ahead or behind} high {Closest to 52-week high} other {Next event soonest}}' }, { kind: o.value })}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="intel-sort-chev" aria-hidden="true" />
    </span>
  )
}
