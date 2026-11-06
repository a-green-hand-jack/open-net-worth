// Assets tab modals — Sell or dispose, and the delete confirmation. Adding an asset is
// AssetWizard.tsx; recording, correcting and removing values are ValueDialogs.tsx and
// ValueHistory.tsx; each section of the asset page has its own editor. Both dialogs here wait
// for the server and keep what was typed, with the server's reason, when it refuses.
import { useId, useState } from 'react'
import type { CashAccountOption, OwnedAsset } from '../../../types/assets'
import { fNum, getBaseCurrency, getCurrencySymbol, localIso } from '../../../utils/format'
import {
  ConfirmDialog,
  DateField,
  FormField,
  Modal,
  MoneyField,
  Select,
  Stack,
  Text,
} from '../../ui'
import * as api from './api'
import { fmt, sharePct } from './assetsData'
import { EditorFooter, SaveError, useEditorSave } from './editorKit'
import { Icons } from './icons'
import { useAppIntl } from '../../../i18n/useAppIntl'

const FIELDS = ['proceeds', 'date', 'account_id'] as const

interface GainHintProps {
  asset: OwnedAsset
  share: number
  proceeds: number
}

/** A co-owner's proceeds are their share, so the gain is against their share of the price. */
function GainHint({ asset, share, proceeds }: GainHintProps) {
  const intl = useAppIntl()
  if (asset.cost == null) return null
  const cost = share < 100 ? Math.round(asset.cost * share) / 100 : asset.cost
  const gain = proceeds - cost
  const tone = gain >= 0 ? 'var(--good)' : 'var(--bad)'
  return (
    <div className="as-hint">
      {Icons.check!({ width: 14, height: 14, style: { color: tone } })}
      <span>
        {share < 100
          ? intl.formatMessage(
              {
                id: 'assets.dispose.gainShare',
                defaultMessage:
                  'Realized gain {gain} against your {share}% of the purchase price, {cost}.',
              },
              {
                gain: (
                  <b style={{ color: tone }}>{(gain >= 0 ? '+' : '−') + fmt(Math.abs(gain))}</b>
                ),
                share: sharePct(share),
                cost: fmt(cost),
              },
            )
          : intl.formatMessage(
              {
                id: 'assets.dispose.gain',
                defaultMessage: 'Realized gain {gain} against a purchase price of {cost}.',
              },
              {
                gain: (
                  <b style={{ color: tone }}>{(gain >= 0 ? '+' : '−') + fmt(Math.abs(gain))}</b>
                ),
                cost: fmt(cost),
              },
            )}
      </span>
    </div>
  )
}

interface Sale {
  proceeds: number
  date: string
  account: string
}

interface SaleFieldsProps {
  asset: OwnedAsset
  /** The user's percentage of the asset — what they sell is that share of it. */
  share: number
  cashAccounts: CashAccountOption[]
  sale: Sale
  onSale(patch: Partial<Sale>): void
  today: string
  errors: Partial<Record<'proceeds' | 'date' | 'account_id', string>>
  /** A money field's text can't be read (true) or can again (false) — its owner must not save. */
  onUnreadable?(field: string, unreadable: boolean): void
}

/** Sold for (a co-owner's share of the sale) · Sold on (today at most, never before the
 *  purchase) · Proceeds into. */
function SaleFields(props: SaleFieldsProps) {
  const intl = useAppIntl()
  const { asset, share, cashAccounts, sale, onSale, today, errors } = props
  const id = useId()
  const partial = share < 100
  // Only a cash account in the base currency can take the proceeds (the server's rule); with
  // none, say so rather than leave Record disposal silently off.
  const accountError =
    errors.account_id ??
    (cashAccounts.length === 0
      ? intl.formatMessage(
          {
            id: 'assets.dispose.cashRequired',
            defaultMessage: 'Pick a cash account in {currency}.',
          },
          { currency: getBaseCurrency() },
        )
      : undefined)
  return (
    <div className="as-form">
      <FormField
        label={
          partial
            ? intl.formatMessage({
                id: 'assets.dispose.yourSale',
                defaultMessage: 'Your share of the sale',
              })
            : intl.formatMessage({ id: 'assets.dispose.soldFor', defaultMessage: 'Sold for' })
        }
        htmlFor={`${id}-proceeds`}
        help={
          partial
            ? intl.formatMessage(
                {
                  id: 'assets.dispose.shareHelp',
                  defaultMessage: 'Your {share}% — what lands in the account below.',
                },
                { share: sharePct(share) },
              )
            : undefined
        }
        error={errors.proceeds}
      >
        <MoneyField
          id={`${id}-proceeds`}
          invalid={!!errors.proceeds}
          prefix={getCurrencySymbol(asset.currency)}
          value={sale.proceeds}
          formattedValue={fNum(sale.proceeds)}
          onValueChange={(proceeds) => onSale({ proceeds })}
          onInvalidChange={(bad) => props.onUnreadable?.('proceeds', bad)}
        />
      </FormField>
      <FormField
        label={intl.formatMessage({ id: 'assets.dispose.soldOn', defaultMessage: 'Sold on' })}
        htmlFor={`${id}-date`}
        error={errors.date}
      >
        <DateField
          id={`${id}-date`}
          invalid={!!errors.date}
          max={today}
          min={asset.cost_date ?? undefined}
          value={sale.date}
          onChange={(e) => onSale({ date: e.target.value })}
        />
      </FormField>
      <FormField
        label={intl.formatMessage({
          id: 'assets.dispose.proceedsInto',
          defaultMessage: 'Proceeds into',
        })}
        htmlFor={`${id}-account`}
        span="full"
        help={intl.formatMessage({
          id: 'assets.dispose.realTransaction',
          defaultMessage: 'Posts a real transaction',
        })}
        error={accountError}
      >
        <Select
          id={`${id}-account`}
          invalid={!!accountError}
          value={sale.account}
          onChange={(e) => onSale({ account: e.target.value })}
          options={cashAccounts.map((a) => ({
            value: a.id,
            label: `${a.name} · ${fmt(a.balance_base)}`,
          }))}
        />
      </FormField>
    </div>
  )
}

export interface DisposeModalProps {
  asset: OwnedAsset
  cashAccounts: CashAccountOption[]
  onClose(): void
  /** The sale is recorded — the asset is archived. */
  onDisposed(): void
}

export function DisposeModal({ asset, cashAccounts, onClose, onDisposed }: DisposeModalProps) {
  const intl = useAppIntl()
  const today = localIso()
  const share = asset.share_pct ?? 100
  // The proceeds post to cash verbatim, while net worth only ever counted the user's share —
  // so the prefill is that share (the server's `share_value`), never the whole asset's value.
  const [sale, setSale] = useState<Sale>(() => ({
    proceeds: asset.share_value ?? 0,
    date: today,
    account: cashAccounts[0]?.id ?? '',
  }))
  const { saving, save, check, errorFor, edited, unreadable, dialogError } = useEditorSave()

  async function onSave() {
    if (
      !check({
        date:
          sale.date > today
            ? intl.formatMessage({
                id: 'assets.dispose.futureDate',
                defaultMessage: "Pick a date that isn't in the future.",
              })
            : undefined,
      })
    )
      return
    const { proceeds, date, account } = sale
    const body = { proceeds, account_id: account, ...(date ? { date } : {}) }
    if (await save(() => api.disposeAsset(asset.id, body))) onDisposed()
  }

  return (
    <Modal
      className="as-modal"
      open
      onClose={onClose}
      title={intl.formatMessage({ id: 'assets.dispose.title', defaultMessage: 'Sell or dispose' })}
      subtitle={asset.name}
      size="sm"
      footer={
        <EditorFooter
          saving={saving}
          label={intl.formatMessage({
            id: 'assets.dispose.record',
            defaultMessage: 'Record disposal',
          })}
          onCancel={onClose}
          onSave={onSave}
          disabled={!sale.account}
        />
      }
    >
      <Stack gap="--space-6">
        <SaleFields
          asset={asset}
          share={share}
          cashAccounts={cashAccounts}
          sale={sale}
          onSale={(patch) => {
            setSale((s) => ({ ...s, ...patch }))
            // Editing a field clears whatever was said beside it.
            edited(...Object.keys(patch).map((k) => (k === 'account' ? 'account_id' : k)))
          }}
          today={today}
          errors={{
            proceeds: errorFor('proceeds'),
            date: errorFor('date'),
            account_id: errorFor('account_id'),
          }}
          onUnreadable={unreadable}
        />
        <GainHint asset={asset} share={share} proceeds={sale.proceeds} />
        <Text as="p" size="xs" tone="muted">
          {intl.formatMessage({
            id: 'assets.dispose.archiveHelp',
            defaultMessage:
              'The asset is archived, not deleted. Its full value history and documents stay readable, and it drops out of net worth from the disposal date.',
          })}
        </Text>
        <SaveError message={dialogError(FIELDS)} />
      </Stack>
    </Modal>
  )
}

export interface DeleteAssetConfirmProps {
  asset: OwnedAsset
  onClose(): void
  /** The asset and its history are gone. */
  onDeleted(): void
}

export function DeleteAssetConfirm({ asset, onClose, onDeleted }: DeleteAssetConfirmProps) {
  const intl = useAppIntl()
  const { saving, save, dialogError } = useEditorSave()
  async function confirm() {
    if (await save(() => api.deleteAsset(asset.id))) onDeleted()
  }
  return (
    <ConfirmDialog
      data={{
        title: intl.formatMessage({
          id: 'assets.delete.title',
          defaultMessage: 'Delete this asset?',
        }),
        body: (
          <>
            {intl.formatMessage(
              {
                id: 'assets.delete.warning',
                defaultMessage:
                  "Delete <b>{name}</b> and its history? This can't be undone. If you sold it, use Sell or dispose instead — that keeps its history.",
              },
              { name: asset.name, b: (chunks) => <b>{chunks}</b> },
            )}
            <SaveError message={dialogError([])} />
          </>
        ),
        confirmLabel: saving
          ? intl.formatMessage({ id: 'common.deleting', defaultMessage: 'Deleting…' })
          : intl.formatMessage({ id: 'common.delete', defaultMessage: 'Delete' }),
        danger: true,
        confirmDisabled: saving,
      }}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    />
  )
}
