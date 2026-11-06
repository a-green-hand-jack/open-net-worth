// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { syncDesktopDisplay, syncDesktopProfileSnapshot } from './desktopDateFormat'

describe('desktop date format sync', () => {
  afterEach(() => {
    delete window.onwDesktopClient
  })

  it('passes supported profile values and clears absent or unknown values', () => {
    const setProfileDisplay = vi.fn()
    window.onwDesktopClient = { setProfileDisplay } as unknown as NonNullable<
      Window['onwDesktopClient']
    >
    for (const value of ['dmy', 'mdy', 'iso', null, 'invalid']) syncDesktopDisplay('zh-CN', value)
    expect(setProfileDisplay.mock.calls).toEqual([
      ['zh-CN', 'dmy'],
      ['zh-CN', 'mdy'],
      ['zh-CN', 'iso'],
      ['zh-CN', null],
      ['zh-CN', null],
    ])
  })

  it('waits during loading, falls back on failure, and prefers cached profile on failure', () => {
    const setProfileDisplay = vi.fn()
    window.onwDesktopClient = { setProfileDisplay } as unknown as NonNullable<
      Window['onwDesktopClient']
    >
    syncDesktopProfileSnapshot(undefined, null)
    expect(setProfileDisplay).not.toHaveBeenCalled()
    syncDesktopProfileSnapshot(undefined, new Error('offline'))
    expect(setProfileDisplay).toHaveBeenLastCalledWith('en', null)
    syncDesktopProfileSnapshot({ language: 'zh-CN', date_format: 'dmy' }, new Error('offline'))
    expect(setProfileDisplay).toHaveBeenLastCalledWith('zh-CN', 'dmy')
  })
})
