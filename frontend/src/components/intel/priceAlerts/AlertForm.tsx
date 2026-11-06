import { getNumberLocale } from '../../../utils/format'
import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
// Create / edit — one alert, one form (verbatim port of the prototype's AlertForm).
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button,
  FormField,
  Modal,
  Money,
  NumberField,
  SegmentedControl,
  Select,
  Switch,
  TextArea,
  TextField,
} from '../../ui'
import { ArrowDown, ArrowUp, ChevronDown } from '../../../ui/icons'
import { AFTER, fmt, toFire } from './alertModel'
import type { AfterFire, AlertDraft, AlertKind } from './alertModel'
import {
  channelKey,
  keyToChannels,
  notifyOptions,
  routeHelp,
  useAlertRouting,
} from './alertRouting'

export interface AlertFormProps {
  draft: AlertDraft
  sym: string
  name: string
  ccy: string
  price: number | null
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (d: AlertDraft) => void
  onDelete?: () => void
}

const afterLabels = defineMessages({
  off: { id: 'intel.alert.afterOff', defaultMessage: 'Turn off' },
  '0': { id: 'intel.alert.afterNone', defaultMessage: 'No cooldown' },
  '15': { id: 'intel.alert.after15', defaultMessage: '15 min' },
  '30': { id: 'intel.alert.after30', defaultMessage: '30 min' },
  '60': { id: 'intel.alert.after60', defaultMessage: '1 hour' },
  '360': { id: 'intel.alert.after360', defaultMessage: '6 hours' },
  '720': { id: 'intel.alert.after720', defaultMessage: '12 hours' },
  '1440': { id: 'intel.alert.after1440', defaultMessage: '24 hours' },
})

type Dir = 'up' | 'down'

/** The design-system chevron over a native select (the prototype shows the browser's own
 * arrow; the owner asked for the house one). Same pattern as `.pl-selwrap` / `.firstrun-select-wrap`. */
function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <span className="pa-sel">
      {children}
      <ChevronDown size={14} strokeWidth={2} className="pa-sel-cv" aria-hidden="true" />
    </span>
  )
}

export function AlertForm({
  draft,
  sym,
  name: assetName,
  ccy,
  price,
  saving,
  error,
  onCancel,
  onSave,
  onDelete,
}: AlertFormProps) {
  const intl = useAppIntl()
  const [mode, setMode] = useState<AlertKind>(draft.mode)
  const [value, setValue] = useState(draft.value != null ? String(draft.value) : '')
  const [move, setMove] = useState(String(draft.move.toFixed(2)))
  const [after, setAfter] = useState<AfterFire>(draft.after)
  const [pickedChannels, setPickedChannels] = useState<string[] | null>(draft.channels)
  const [note, setNote] = useState(draft.note)
  const [name, setName] = useState(draft.name)
  const [moveDir, setMoveDir] = useState<Dir>(
    draft.mode === 'move' && draft.op === '<=' ? 'down' : draft.mode === 'move' ? 'up' : 'up',
  )
  const [priceDir, setPriceDir] = useState<Dir>(
    draft.mode === 'price' && draft.op === '>=' ? 'up' : 'down',
  )
  const [enabled, setEnabled] = useState(draft.enabled)
  const routing = useAlertRouting()
  // A new alert shows Settings' price-alert default until the user picks; after that (or on
  // an existing alert) the alert's own list is the whole story.
  const channels = pickedChannels ?? routing?.defaults ?? []
  const v = Number(value) || 0
  /* Direction isn't a question: a target above today's price can only mean "rises above". */
  const op = (mode === 'move' ? moveDir : priceDir) === 'up' ? '>=' : '<='
  const gap = v > 0 && price ? toFire(op, v, price) : null
  const editing = !!draft.id
  const mv = Number(move) || 0
  const valid = mode === 'price' ? v > 0 : mv > 0 && mv <= 100

  const query = mode === 'price'
    ? intl.formatMessage({ id: 'intel.alert.queryPrice', defaultMessage: 'Explain the factors driving the latest movement of {symbol} ({name}), including its recent {direction} {price}. Contextualize this price movement within the last few weeks of price action and investor narrative.' }, { symbol: sym, name: assetName, direction: op === '>=' ? intl.formatMessage({ id: 'intel.alert.riseTo', defaultMessage: 'rise to' }) : intl.formatMessage({ id: 'intel.alert.fallTo', defaultMessage: 'fall to' }), price: <Money>{ccy}{v ? fmt(v) : '—'}</Money> })
    : intl.formatMessage({ id: 'intel.alert.queryMove', defaultMessage: 'Explain the factors driving a {move}% {direction} in {symbol} ({name}). Contextualize this price movement within the last few weeks of price action and investor narrative.' }, { move: mv.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }), direction: moveDir === 'up' ? intl.formatMessage({ id: 'intel.alert.rise', defaultMessage: 'rise' }) : intl.formatMessage({ id: 'intel.alert.fall', defaultMessage: 'fall' }), symbol: sym, name: assetName })

  const dirButtons = (dir: Dir, set: (d: Dir) => void, labels: [string, string]) => (
    <>
      <button
        type="button"
        aria-pressed={dir === 'down'}
        aria-label={labels[0]}
        className={'pa-dir-b' + (dir === 'down' ? ' pa-dir-b--on pa-dir-b--dn' : '')}
        onClick={() => set('down')}
      >
        <ArrowDown size={14} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-pressed={dir === 'up'}
        aria-label={labels[1]}
        className={'pa-dir-b' + (dir === 'up' ? ' pa-dir-b--on pa-dir-b--up' : '')}
        onClick={() => set('up')}
      >
        <ArrowUp size={14} strokeWidth={2.2} />
      </button>
    </>
  )

  return (
    <Modal
      open
      onClose={onCancel}
      size="lg"
      className="pa-modal"
      title={editing ? intl.formatMessage({ id: 'intel.alert.editTitle', defaultMessage: 'Edit alert · {symbol}' }, { symbol: sym }) : intl.formatMessage({ id: 'intel.alert.newTitle', defaultMessage: "New alert" })}
      footer={
        <div className="pa-foot">
          {editing && onDelete && (
            <button type="button" className="pa-del" onClick={onDelete} disabled={saving}>
              {intl.formatMessage({ id: 'intel.alert.delete', defaultMessage: "Delete alert" })}
            </button>
          )}
          {error && <span className="pa-err">{error}</span>}
          <div className="pa-foot-r">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {intl.formatMessage({ id: 'intel.alert.cancel', defaultMessage: "Cancel" })}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!valid}
              onClick={() =>
                onSave({
                  ...draft,
                  name,
                  mode,
                  op,
                  value: mode === 'price' ? v : null,
                  move: mv,
                  after,
                  channels: pickedChannels ?? routing?.defaults ?? null,
                  note,
                  enabled,
                })
              }
            >
              {editing ? intl.formatMessage({ id: 'intel.alert.save', defaultMessage: "Save alert" }) : intl.formatMessage({ id: 'intel.alert.create', defaultMessage: "Create alert" })}
            </Button>
          </div>
        </div>
      }
    >
      <div className="pa-fields">
        {editing && (
          <div className="pa-formsw">
            <span className="pa-formsw-b">
              <span className="pa-formsw-t">{enabled ? intl.formatMessage({ id: 'intel.alert.active', defaultMessage: "Active" }) : intl.formatMessage({ id: 'intel.alert.paused', defaultMessage: "Paused" })}</span>
            </span>
            <Switch
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              aria-label={intl.formatMessage({ id: 'intel.alert.alertOn', defaultMessage: "Alert on" })}
            />
          </div>
        )}

        <FormField label={intl.formatMessage({ id: 'intel.alert.ticker', defaultMessage: "Ticker" })} htmlFor="pa-tk">
          <SelectWrap>
            <Select id="pa-tk" value={sym} disabled options={[{ value: sym, label: sym }]} />
          </SelectWrap>
        </FormField>

        <FormField label={intl.formatMessage({ id: 'intel.alert.nameOptional', defaultMessage: "Name (optional)" })} htmlFor="pa-name">
          <TextField
            id="pa-name"
            value={name}
            maxLength={40}
            placeholder={intl.formatMessage({ id: 'intel.alert.namePlaceholder', defaultMessage: "e.g. Stop-loss zone" })}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <div className="pa-row2">
          <FormField label={intl.formatMessage({ id: 'intel.alert.criteria', defaultMessage: "Alert criteria" })}>
            <SegmentedControl<AlertKind>
              ariaLabel={intl.formatMessage({ id: 'intel.alert.criteria', defaultMessage: "Alert criteria" })}
              tone="primary"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'price', label: intl.formatMessage({ id: 'intel.alert.target', defaultMessage: "Target price" }) },
                { value: 'move', label: intl.formatMessage({ id: 'intel.alert.percentMove', defaultMessage: "% move" }) },
              ]}
            />
          </FormField>
          {mode === 'price' ? (
            <FormField
              htmlFor="pa-val"
              label={
                price != null ? (
                  <>
                    {intl.formatMessage({ id: 'intel.alert.targetNow', defaultMessage: 'Target price (now' })}{' '}
                    <Money>
                      {ccy}
                      {fmt(price)}
                    </Money>
                    )
                  </>
                ) : (
                  intl.formatMessage({ id: 'intel.alert.target', defaultMessage: "Target price" })
                )
              }
              help={
                gap !== null && gap <= 0
                  ? intl.formatMessage({ id: 'intel.alert.alreadyTriggered', defaultMessage: '{symbol} is already {direction} this level — it would alert right away' }, { symbol: sym, direction: priceDir === 'up' ? intl.formatMessage({ id: 'intel.alert.above', defaultMessage: 'above' }) : intl.formatMessage({ id: 'intel.alert.below', defaultMessage: 'below' }) })
                  : undefined
              }
            >
              <div className="pa-dir">
                {dirButtons(priceDir, setPriceDir, [intl.formatMessage({ id: 'intel.alert.fallsBelow', defaultMessage: "Falls below" }), intl.formatMessage({ id: 'intel.alert.risesAbove', defaultMessage: "Rises above" })])}
                <NumberField
                  id="pa-val"
                  min={0}
                  step="any"
                  invalid={gap !== null && gap <= 0}
                  value={value}
                  placeholder="0.00"
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </FormField>
          ) : (
            <FormField label={intl.formatMessage({ id: 'intel.alert.movement', defaultMessage: "Movement amount (%)" })} htmlFor="pa-mv">
              <div className="pa-dir">
                {dirButtons(moveDir, setMoveDir, [intl.formatMessage({ id: 'intel.alert.fallsBy', defaultMessage: "Falls by" }), intl.formatMessage({ id: 'intel.alert.risesBy', defaultMessage: "Rises by" })])}
                <NumberField
                  id="pa-mv"
                  min={0}
                  max={100}
                  step="any"
                  value={move}
                  placeholder="0.00"
                  onChange={(e) => setMove(e.target.value)}
                />
              </div>
            </FormField>
          )}
        </div>

        <div className="pa-row2">
          <FormField label={intl.formatMessage({ id: 'intel.alert.cooldown', defaultMessage: "Cooldown" })} htmlFor="pa-af">
            <SelectWrap>
              <Select
                id="pa-af"
                value={after}
                onChange={(e) => setAfter(e.target.value as AfterFire)}
                options={AFTER.map(([v, l]) => ({ value: v, label: Object.hasOwn(afterLabels, v) ? intl.formatMessage(afterLabels[v] as MessageDescriptor) : l }))}
              />
            </SelectWrap>
          </FormField>
          <FormField label={intl.formatMessage({ id: 'intel.alert.notifications', defaultMessage: "Notifications" })} htmlFor="pa-ch" help={routeHelp(channels, routing, intl)}>
            <SelectWrap>
              <Select
                id="pa-ch"
                value={channelKey(channels, routing)}
                onChange={(e) => setPickedChannels(keyToChannels(e.target.value))}
                options={notifyOptions(routing, channels, intl)}
              />
            </SelectWrap>
          </FormField>
        </div>

        <FormField label={intl.formatMessage({ id: 'intel.alert.defaultQuery', defaultMessage: "Default query" })}>
          <span className="pa-quote">{query}</span>
        </FormField>

        <FormField label={intl.formatMessage({ id: 'intel.alert.instructions', defaultMessage: "Additional instructions (optional)" })} htmlFor="pa-note">
          <TextArea
            id="pa-note"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={intl.formatMessage({ id: 'intel.alert.instructionsPlaceholder', defaultMessage: "Check news and social media sentiment to assess consensus or controversy" })}
          />
        </FormField>
      </div>
    </Modal>
  )
}
