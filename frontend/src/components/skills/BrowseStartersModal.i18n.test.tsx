// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../i18n/catalogs'
import registry from './starterSkills.registry.json'
import chinese from './starterSkills.zh-CN.json'

const authFetch = vi.hoisted(() => vi.fn())
vi.mock('../../api/client', () => ({ authFetch }))
import { BrowseStartersModal } from './BrowseStartersModal'

afterEach(() => { cleanup(); authFetch.mockReset() })

it('translates verified starter display text and adds the original skill ID', async () => {
  const id = 'catch-up'
  const entry = registry[id]
  const starter = { id, name: entry.name.english, description: entry.description.english,
    starter_source: { id, name_sha256: entry.name.sha256, description_sha256: entry.description.sha256 } }
  authFetch.mockImplementation(async (url: string) => new Response(JSON.stringify(
    url === '/api/skills/starters' ? [starter] : { ok: true, skill: { ...starter, body: 'Original skill body' } },
  )))
  const onAdded = vi.fn()
  render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><BrowseStartersModal onClose={vi.fn()} onAdded={onAdded} /></IntlProvider>)
  expect(await screen.findByText(chinese[id].name)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '添加' }))
  await waitFor(() => expect(onAdded).toHaveBeenCalledWith(expect.objectContaining({ id, body: 'Original skill body' })))
  expect(authFetch).toHaveBeenCalledWith('/api/skills/starters/catch-up', { method: 'POST' })
})
