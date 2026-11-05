// Settings → Memory. Its own section since 2026-10-27 (was half of "Chat & Memory"), laid out
// like Claude's memory settings. ADR 2026-10-25-memory-keeps-only-what-has-no-other-home.
import { useState } from 'react'
import { authFetch } from '../../../../api/client'
import { useCachedFetchState } from '../../../../state/queryCache'
import {
  MEMORY_SETTINGS_KEY,
  getMemorySettings,
  type MemorySettings,
} from '../../../../hooks/useMemoryFacts'
import { downloadMemoryExport } from '../../../../hooks/memoryImport'
import { Btn, Panel, Toggle, row, useSectionBack, useSectionBusy } from '../ds'
import { MemoryBrowser } from '../MemoryBrowser'
import { MemoryImport } from '../MemoryImport'
import type { SectionProps } from '../ds'
import { useAppIntl } from '../../../../i18n/useAppIntl'

type Key = keyof MemorySettings

export function MemorySection({ toast }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const memory = useCachedFetchState(MEMORY_SETTINGS_KEY, getMemorySettings, { staleTime: 0 })
  const settings = memory.data
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useSectionBusy(memory.initialLoading && !settings)
  const placeBack = useSectionBack()

  async function putSetting(key: Key, value: boolean, done: string) {
    try {
      const r = await authFetch(MEMORY_SETTINGS_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            { id: 'settings.chat.saveHttp', defaultMessage: 'Could not save (HTTP {status})' },
            { status: r.status },
          ),
        )
        return
      }
      void memory.refresh()
      toast(done)
    } catch {
      toast(
        formatMessage({
          id: 'settings.chat.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function exportMemory() {
    setExporting(true)
    try {
      await downloadMemoryExport()
      toast(formatMessage({ id: 'settings.memory.exported', defaultMessage: 'Memory exported' }))
    } catch (e) {
      toast(
        e instanceof Error
          ? e.message
          : formatMessage({
              id: 'settings.memory.exportError',
              defaultMessage: 'Could not export. Try again.',
            }),
      )
    } finally {
      setExporting(false)
    }
  }

  const toggle = (key: Key, label: string, done: (on: boolean) => string) => (
    <Toggle
      on={settings?.[key] ?? false}
      disabled={!settings}
      onChange={(v) => void putSetting(key, v, done(v))}
      label={label}
    />
  )

  return (
    <>
      {importing && <MemoryImport toast={toast} onClose={() => setImporting(false)} />}
      <MemoryBrowser
        toast={toast}
        placeBack={placeBack}
        disabled={settings?.enabled === false}
        header={
          <Panel
            sub={formatMessage({
              id: 'settings.memory.subtitle',
              defaultMessage: 'What Lucius remembers about you between conversations',
            })}
          >
            {row(
              formatMessage({
                id: 'settings.memory.search',
                defaultMessage: 'Search and reference chats',
              }),
              formatMessage({
                id: 'settings.memory.searchHelp',
                defaultMessage:
                  'Let Lucius search your past conversations for relevant details. Even when this is off, he can still read them with a SQL query.',
              }),
              toggle(
                'search_chats',
                formatMessage({
                  id: 'settings.memory.search',
                  defaultMessage: 'Search and reference chats',
                }),
                (on) =>
                  on
                    ? formatMessage({
                        id: 'settings.memory.searchOn',
                        defaultMessage: 'Lucius can search your past chats',
                      })
                    : formatMessage({
                        id: 'settings.memory.searchOff',
                        defaultMessage: 'Lucius won’t search your past chats',
                      }),
              ),
            )}
            {row(
              formatMessage({
                id: 'settings.memory.generate',
                defaultMessage: 'Generate memory from chats',
              }),
              formatMessage({
                id: 'settings.memory.generateHelp',
                defaultMessage:
                  'Let Lucius remember useful details from your conversations and automations, and use them in replies.',
              }),
              toggle(
                'enabled',
                formatMessage({
                  id: 'settings.memory.generate',
                  defaultMessage: 'Generate memory from chats',
                }),
                (on) =>
                  on
                    ? formatMessage({ id: 'settings.memory.on', defaultMessage: 'Memory on' })
                    : formatMessage({
                        id: 'settings.memory.off',
                        defaultMessage: 'Memory off — nothing is extracted or recalled',
                      }),
              ),
            )}
            {row(
              formatMessage({
                id: 'settings.memory.sensitive',
                defaultMessage: 'Include sensitive topics in memory',
              }),
              formatMessage({
                id: 'settings.memory.sensitiveHelp',
                defaultMessage:
                  'Let Lucius save details about sensitive topics like health conditions or religious beliefs.',
              }),
              toggle(
                'sensitive_topics',
                formatMessage({
                  id: 'settings.memory.sensitive',
                  defaultMessage: 'Include sensitive topics in memory',
                }),
                (on) =>
                  on
                    ? formatMessage({
                        id: 'settings.memory.sensitiveOn',
                        defaultMessage: 'Sensitive topics can be remembered',
                      })
                    : formatMessage({
                        id: 'settings.memory.sensitiveOff',
                        defaultMessage: 'Sensitive topics won’t be remembered',
                      }),
              ),
            )}
            {row(
              formatMessage({
                id: 'settings.memory.import',
                defaultMessage: 'Import memory from other AI providers',
              }),
              formatMessage({
                id: 'settings.memory.importHelp',
                defaultMessage:
                  'Bring relevant context and data from another AI provider to Lucius. We’ll provide a prompt you can use to fetch the memory from your other account.',
              }),
              <Btn size="xs" onClick={() => setImporting(true)}>
                {formatMessage({
                  id: 'settings.memory.startImport',
                  defaultMessage: 'Start import',
                })}
              </Btn>,
            )}
            {row(
              formatMessage({ id: 'settings.memory.export', defaultMessage: 'Export memory' }),
              formatMessage({
                id: 'settings.memory.exportHelp',
                defaultMessage: 'Download your memory as a .zip of Markdown files.',
              }),
              <Btn size="xs" disabled={exporting} onClick={() => void exportMemory()}>
                {exporting
                  ? formatMessage({ id: 'settings.memory.exporting', defaultMessage: 'Exporting…' })
                  : formatMessage({ id: 'settings.memory.exportAction', defaultMessage: 'Export' })}
              </Btn>,
            )}
          </Panel>
        }
      />
    </>
  )
}
