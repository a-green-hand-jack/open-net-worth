// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { InstitutionManager } from './InstitutionManager'

afterEach(cleanup)

const institution = { id: 'inst_dbs', name: 'DBS', accountCount: 2 }

describe('InstitutionManager', () => {
  it('reports the old and new labels after a shared rename', async () => {
    const onRenamed = vi.fn()
    render(
      <InstitutionManager
        open
        institutions={[institution]}
        onClose={() => {}}
        onRename={async () => ({ ...institution, name: 'DBS Bank' })}
        onDelete={async () => ({
          id: institution.id,
          unlinked_account_count: 2,
          unlinked_account_ids: [],
        })}
        onRenamed={onRenamed}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Rename DBS' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Institution name for DBS' }), {
      target: { value: 'DBS Bank' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(onRenamed).toHaveBeenCalledWith(institution, { ...institution, name: 'DBS Bank' }),
    )
  })

  it('names the accounts under each institution, falling back to the count', () => {
    render(
      <InstitutionManager
        open
        institutions={[
          { ...institution, accountNames: ['Checking', 'Savings'] },
          { id: 'inst_x', name: 'Empty', accountCount: 0, accountNames: [] },
        ]}
        onClose={() => {}}
        onRename={async () => institution}
        onDelete={async () => ({ id: '', unlinked_account_count: 0, unlinked_account_ids: [] })}
      />,
    )
    expect(screen.getByText('Checking, Savings')).toBeTruthy()
    expect(screen.getByText('0 accounts')).toBeTruthy()
  })
  it('translates the deletion impact without changing saved names or identifiers', async () => {
    const onDelete = vi.fn(async (id: string) => ({
      id,
      unlinked_account_count: 2,
      unlinked_account_ids: [],
    }))
    render(
      <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
        <InstitutionManager
          open
          institutions={[institution]}
          onClose={() => {}}
          onRename={async () => institution}
          onDelete={onDelete}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('管理机构')).toBeTruthy()
    expect(screen.getByText('2 个账户')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '删除DBS' }))
    expect(screen.getByText('删除DBS？')).toBeTruthy()
    expect(
      screen.getByText('这会解除其与 2 个账户的关联。账户、余额和交易记录会保留。'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '解除关联并删除' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('inst_dbs'))
  })
})
