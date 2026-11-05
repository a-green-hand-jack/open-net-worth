// Rename or change category — the asset's name, the line under it, and its category. Saves
// exactly {name, description, category} (RFC §3.4): its facts are never sent, so a category
// change keeps every one of them (the Details section re-reads them for the new category).
import { useId, useState } from 'react'
import type { AssetCategory, OwnedAsset } from '../../../types/assets'
import { FormField, Modal, Select, Stack, TextField } from '../../ui'
import * as api from './api'
import { BUILTIN_CATS, catOf } from './assetsData'
import { EditorFooter, SaveError, useEditorSave } from './editorKit'
import { Icons } from './icons'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { assetCategoryLabel } from './categoryLabels'
import type { IntlShape } from 'react-intl'

const FIELDS = ['name', 'description', 'category'] as const

/** Every category to move to — the asset's own too, even if it is no longer listed. */
function categoryOptions(list: AssetCategory[], current: string, intl: IntlShape) {
  const options = list.map((c) => ({ value: c.key, label: assetCategoryLabel(intl, c) }))
  if (!list.some((c) => c.key === current)) options.push({ value: current, label: current })
  return options
}

function MoveHint({ label }: { label: string }) {
  const { formatMessage } = useAppIntl()
  return (
    <div className="as-hint">
      {Icons.clock!({ width: 14, height: 14 })}
      <span>
        {formatMessage(
          {
            id: 'assets.rename.moveHint',
            defaultMessage:
              'Moving this to {category} changes the suggested details. Its values and documents stay with it.',
          },
          { category: label },
        )}
      </span>
    </div>
  )
}

export interface RenameCategoryEditorProps {
  a: OwnedAsset
  cats: AssetCategory[]
  onClose(): void
  onSaved(message: string): void
}

export function RenameCategoryEditor({ a, cats, onClose, onSaved }: RenameCategoryEditorProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const id = useId()
  const [name, setName] = useState(a.name)
  const [description, setDescription] = useState(a.description)
  const [category, setCategory] = useState(a.category)
  const { saving, save, check, errorFor, edited, dialogError } = useEditorSave()
  const list = cats.length ? cats : BUILTIN_CATS

  async function onSave() {
    if (
      !check({
        name: name.trim()
          ? undefined
          : formatMessage({ id: 'assets.docs.enterName', defaultMessage: 'Enter a name.' }),
      })
    )
      return
    const changes = { name: name.trim(), description: description.trim(), category }
    if (await save(() => api.updateAsset(a.id, changes)))
      onSaved(
        formatMessage({ id: 'assets.rename.saved', defaultMessage: 'Name and category saved.' }),
      )
  }

  return (
    <Modal
      className="as-modal"
      open
      onClose={onClose}
      title={formatMessage({
        id: 'assets.detail.rename',
        defaultMessage: 'Rename or change category',
      })}
      subtitle={a.name}
      size="md"
      footer={
        <EditorFooter
          saving={saving}
          label={formatMessage({ id: 'assets.details.save', defaultMessage: 'Save changes' })}
          onCancel={onClose}
          onSave={onSave}
        />
      }
    >
      <Stack gap="--space-6">
        <FormField
          label={formatMessage({ id: 'assets.docs.name', defaultMessage: 'Name' })}
          htmlFor={`${id}-name`}
          required
          error={errorFor('name')}
        >
          <TextField
            id={`${id}-name`}
            autoFocus
            invalid={!!errorFor('name')}
            value={name}
            maxLength={api.TEXT_CAPS.name}
            onChange={(e) => {
              setName(e.target.value)
              edited('name')
            }}
          />
        </FormField>
        <FormField
          label={formatMessage({
            id: 'assets.rename.description',
            defaultMessage: 'Short description',
          })}
          htmlFor={`${id}-description`}
          error={errorFor('description')}
        >
          <TextField
            id={`${id}-description`}
            invalid={!!errorFor('description')}
            value={description}
            maxLength={api.TEXT_CAPS.description}
            onChange={(e) => {
              setDescription(e.target.value)
              edited('description')
            }}
          />
        </FormField>
        <FormField
          label={formatMessage({ id: 'assets.rename.category', defaultMessage: 'Category' })}
          htmlFor={`${id}-category`}
          error={errorFor('category')}
        >
          <Select
            id={`${id}-category`}
            invalid={!!errorFor('category')}
            value={category}
            options={categoryOptions(list, a.category, intl)}
            onChange={(e) => {
              setCategory(e.target.value)
              edited('category')
            }}
          />
        </FormField>
        {category !== a.category && (
          <MoveHint label={assetCategoryLabel(intl, catOf(list, category))} />
        )}
        <SaveError message={dialogError(FIELDS)} />
      </Stack>
    </Modal>
  )
}
