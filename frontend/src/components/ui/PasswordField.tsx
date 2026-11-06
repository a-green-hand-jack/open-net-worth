import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from '../../ui/icons'
import { useAppIntl } from '../../i18n/useAppIntl'

export interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  /** Controlled reveal state — when provided (with onToggleShown), the parent owns
   *  the eye. Used for server-side-stored secrets where revealing means fetching. */
  shown?: boolean
  onToggleShown?: () => void
  /** True during the server round-trip a reveal makes — shows a spinner in place of
   *  the eye icon and disables the toggle, so the wait is visible without a caption. */
  loading?: boolean
}

/**
 * PasswordField — a secret input (token / password / API key) with a show/hide eye
 * toggle. Defaults to masked; the eye reveals the value so the user can verify what
 * they typed/pasted. Use this anywhere a secret is entered instead of a bare
 * `TextField type="password"`. Reuses `.ui-input` so it matches every other field.
 *
 * Uncontrolled by default (internal eye state). Pass `shown` + `onToggleShown`
 * to control the eye from the parent — the ONLY reveal affordance stays the eye,
 * even when revealing requires a server round-trip (saved write-only keys).
 */
export function PasswordField({
  invalid,
  className,
  shown: shownProp,
  onToggleShown,
  loading,
  ...rest
}: PasswordFieldProps) {
  const intl = useAppIntl()
  const [shownInternal, setShownInternal] = useState(false)
  const shown = shownProp ?? shownInternal
  const toggle = onToggleShown ?? (() => setShownInternal((s) => !s))
  const id = useId()
  const classes = [
    'ui-input',
    'ui-password__input',
    invalid ? 'ui-input--invalid' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="ui-password">
      <input
        type={shown ? 'text' : 'password'}
        className={classes}
        aria-invalid={invalid || undefined}
        aria-describedby={id}
        {...rest}
      />
      <button
        type="button"
        id={id}
        className="ui-password__toggle"
        onClick={toggle}
        disabled={loading}
        aria-label={loading ? intl.formatMessage({ id: 'shared.password.revealing', defaultMessage: 'Revealing…' }) : shown ? intl.formatMessage({ id: 'shared.password.hideSecret', defaultMessage: 'Hide secret' }) : intl.formatMessage({ id: 'shared.password.showSecret', defaultMessage: 'Show secret' })}
        aria-busy={loading || undefined}
        aria-pressed={shown}
        title={loading ? intl.formatMessage({ id: 'shared.password.revealing', defaultMessage: 'Revealing…' }) : shown ? intl.formatMessage({ id: 'shared.password.hide', defaultMessage: 'Hide' }) : intl.formatMessage({ id: 'shared.password.show', defaultMessage: 'Show' })}
        tabIndex={-1}
      >
        {loading ? (
          <span className="ui-password__spinner" aria-hidden="true" />
        ) : shown ? (
          <EyeOff size={16} strokeWidth={1.7} aria-hidden="true" />
        ) : (
          <Eye size={16} strokeWidth={1.7} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
