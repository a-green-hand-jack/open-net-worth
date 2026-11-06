// Overview v2 — the per-widget "Display" panel (kebab menu → Display…): row
// cap for list-shaped widgets (the def's own `rows` choices), title visibility, auto-fit vs.
// fixed height for prose widgets, and the accent-color picker (curated
// swatches + the existing HSV custom picker, ported from account creation —
// reused here rather than a second implementation).

import { useState } from 'react'
import { Button, Modal } from '../../ui'
import { ColorPicker } from '../accounts/ds'
import { AUTOH_IDS } from './grid'
import { findDefinition } from './definitions'
import { ALL_ROWS, CURATED_ACCENTS, DEFAULT_CUSTOM_HEX, rowCap } from './widgetDisplayShared'
import type { HeightMode } from './types'
import { useAppIntl } from '../../../i18n/useAppIntl'

export interface WidgetDisplayPanelProps {
  open: boolean
  onClose: () => void
  defId: string
  hideTitle?: boolean
  heightMode?: HeightMode
  limit?: number | null
  accent?: string | null
  onSave: (patch: {
    hideTitle?: boolean
    heightMode?: HeightMode
    limit?: number | null
    accent?: string | null
  }) => void
}

export function WidgetDisplayPanel({
  open,
  onClose,
  defId,
  hideTitle,
  heightMode,
  limit,
  accent,
  onSave,
}: WidgetDisplayPanelProps) {
  const { formatMessage } = useAppIntl()
  const colors: Record<string, string> = {
    blue: formatMessage({ id: 'overview.color.blue', defaultMessage: 'Blue' }),
    green: formatMessage({ id: 'overview.color.green', defaultMessage: 'Green' }),
    amber: formatMessage({ id: 'overview.color.amber', defaultMessage: 'Amber' }),
    violet: formatMessage({ id: 'overview.color.violet', defaultMessage: 'Violet' }),
  }
  const [draftHideTitle, setDraftHideTitle] = useState(!!hideTitle)
  const [draftFixed, setDraftFixed] = useState(heightMode === 'fixed')
  const [draftLimit, setDraftLimit] = useState<number | null>(limit ?? null)
  const [draftAccent, setDraftAccent] = useState<string | null>(accent ?? null)

  const rows = findDefinition(defId)?.rows
  const isList = !!rows
  const isAutoh = AUTOH_IDS.has(defId)
  const isCurated = draftAccent == null || CURATED_ACCENTS.some((c) => c.key === draftAccent)
  const customHex = isCurated ? DEFAULT_CUSTOM_HEX : (draftAccent as string)

  const save = () => {
    onSave({
      hideTitle: draftHideTitle,
      heightMode: draftFixed ? 'fixed' : undefined,
      limit: isList ? draftLimit : undefined,
      accent: draftAccent,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage({ id: 'overview.display.title', defaultMessage: 'Display' })}
      size="sm"
    >
      <div className="ov-display-panel">
        <label className="ov-display-row ov-display-checkbox">
          <input
            type="checkbox"
            checked={draftHideTitle}
            onChange={(e) => setDraftHideTitle(e.target.checked)}
          />
          <span>
            {formatMessage({ id: 'overview.display.hideTitle', defaultMessage: 'Hide title' })}
          </span>
        </label>

        {isAutoh && (
          <label className="ov-display-row ov-display-checkbox">
            <input
              type="checkbox"
              checked={draftFixed}
              onChange={(e) => setDraftFixed(e.target.checked)}
            />
            <span>
              {formatMessage({
                id: 'overview.display.fixedHeight',
                defaultMessage: 'Fixed height (manual resize + inner scroll)',
              })}
            </span>
          </label>
        )}

        {isList && (
          <div className="ov-display-row">
            <span className="ov-display-label">
              {formatMessage({ id: 'overview.display.rows', defaultMessage: 'Rows shown' })}
            </span>
            <div
              className="ov-display-limit-seg"
              role="group"
              aria-label={formatMessage({
                id: 'overview.display.rows',
                defaultMessage: 'Rows shown',
              })}
            >
              {rows?.options.map((o) => {
                const value = o === 'all' ? null : o
                const on = rowCap({ limit: draftLimit }, { rows }) === value
                return (
                  <button
                    key={String(o)}
                    type="button"
                    className={'ov-display-limit-opt' + (on ? ' active' : '')}
                    onClick={() => setDraftLimit(value ?? ALL_ROWS)}
                  >
                    {o === 'all' ? formatMessage({ id: 'overview.all', defaultMessage: 'All' }) : o}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="ov-display-row">
          <span className="ov-display-label">
            {formatMessage({ id: 'overview.display.accent', defaultMessage: 'Accent color' })}
          </span>
          <div className="ov-display-swatches">
            <button
              type="button"
              className={
                'ov-display-swatch ov-display-swatch--none' + (draftAccent == null ? ' active' : '')
              }
              title={formatMessage({ id: 'overview.none', defaultMessage: 'None' })}
              aria-label={formatMessage({
                id: 'overview.display.noAccent',
                defaultMessage: 'No accent',
              })}
              onClick={() => setDraftAccent(null)}
            />
            {CURATED_ACCENTS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={'ov-display-swatch' + (draftAccent === c.key ? ' active' : '')}
                style={{ background: c.cssVar }}
                title={colors[c.key] ?? c.label}
                aria-label={colors[c.key] ?? c.label}
                onClick={() => setDraftAccent(c.key)}
              />
            ))}
            <ColorPicker value={customHex} onChange={(hex) => setDraftAccent(hex)} />
          </div>
        </div>

        <div className="ov-display-actions">
          <Button size="sm" variant="secondary" onClick={onClose}>
            {formatMessage({ id: 'overview.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button size="sm" variant="primary" onClick={save}>
            {formatMessage({ id: 'overview.save', defaultMessage: 'Save' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
