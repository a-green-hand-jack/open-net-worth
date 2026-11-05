import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Every API is fulfilled locally: no customer book, network provider, or real profile is read.
const appUrl = process.env.APP_URL || 'http://127.0.0.1:8096'
const url = new URL(appUrl)
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && Number(url.port) >= 8090 && Number(url.port) <= 8099, 'An isolated QA port is required')
const output = resolve('qa/browser-use/artifacts/interface-language')
mkdirSync(output, { recursive: true })
let browser
before(async () => { browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined), args: ['--no-sandbox'] }) })
after(async () => { await browser?.close() })

async function open({ locale = 'en-US', language = null, profileFailure = false, saveFailure = false, viewport = { width: 1440, height: 900 } } = {}) {
  const context = await browser.newContext({ locale, viewport, serviceWorkers: 'block' })
  let profile = { language, base_currency: 'USD', number_format: 'comma', date_format: 'mdy', timezone: 'UTC', seen_intros: [] }
  let failRead = profileFailure
  const writes = []
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/profile' && request.method() === 'PUT') {
      writes.push(request.postDataJSON())
      if (saveFailure) return json({ detail: 'Could not save language. Try again.' }, 503)
      profile = { ...profile, ...request.postDataJSON() }
      return json({ profile })
    }
    if (path === '/api/profile' && request.method() === 'GET') {
      if (failRead) return json({ detail: 'Synthetic profile failure' }, 503)
      return json(profile)
    }
    if (path === '/api/auth/status') return json({ required: false, authenticated: true })
    if (path === '/api/setup-status') return json({ is_fresh: false, restore_pending: false, book_id: 'synthetic-language-qa' })
    if (path === '/api/feature-flags') return json({}, 503)
    if (path === '/api/events') return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    if (['/api/accounts', '/api/intel/signals', '/api/connectors', '/api/sessions', '/api/sessions/live', '/api/models', '/api/matches/reviews'].includes(path)) return json([])
    return json({ items: [], accounts: [], positions: [], rows: [], total: 0 })
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => console.error('PAGE ERROR:', error.message))
  page.on('requestfailed', (request) => console.error('REQUEST FAILED:', request.url(), request.failure()?.errorText))
  await page.goto(`${appUrl}/settings?sub=language`, { waitUntil: 'domcontentloaded' })
  return { page, context, writes, recover: () => { failRead = false }, profile: () => profile }
}

async function select(page, name) {
  const choice = page.getByRole('combobox', { name, exact: true })
  try { await choice.waitFor({ state: 'visible', timeout: 8000 }) } catch (error) { if (await page.getByText('Show Error').count()) await page.getByText('Show Error').click(); console.error('PAGE', page.url(), (await page.locator('body').innerText()).slice(0, 3000)); throw error }
  return choice
}

test('LANG-PROFILE: saved preference wins and changes persist on reload', async () => {
  const app = await open({ locale: 'en-US', language: 'zh-CN' })
  try {
    const choice = await select(app.page, '界面语言')
    await assertEventually(async () => assert.equal(await choice.inputValue(), 'zh-CN'))
    await app.page.screenshot({ path: `${output}/profile-zh.png`, fullPage: true })
    await choice.selectOption('en')
    await assertEventually(() => assert.equal(app.profile().language, 'en'))
    await app.page.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await (await select(app.page, 'Interface language')).inputValue(), 'en')
    assert.deepEqual(app.writes.at(-1), { language: 'en' })
  } finally { await app.context.close() }
})

test('LANG-BROWSER: no preference follows browser on phone', async () => {
  const app = await open({ locale: 'zh-CN', viewport: { width: 390, height: 844 } })
  try {
    const choice = await select(app.page, '界面语言')
    assert.equal(await choice.inputValue(), '')
    assert.equal(await app.page.locator('html').getAttribute('lang'), 'zh-CN')
    await app.page.screenshot({ path: `${output}/browser-mobile.png`, fullPage: true })
    const bounds = await app.page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert.ok(bounds.document <= bounds.viewport, `Horizontal overflow: ${JSON.stringify(bounds)}`)
  } finally { await app.context.close() }
})

test('LANG-FAIL: failed save rolls back; failed load disables selection until retry', async () => {
  const saving = await open({ language: 'en', saveFailure: true })
  try {
    const choice = await select(saving.page, 'Interface language')
    await choice.selectOption('zh-CN')
    await saving.page.getByText('Could not save language. Try again.').waitFor()
    await saving.page.screenshot({ path: `${output}/save-failure.png`, fullPage: true })
    assert.deepEqual(saving.writes, [{ language: 'zh-CN' }])
    await assertEventually(async () => assert.equal(await choice.inputValue(), 'en'))
    assert.equal(saving.profile().language, 'en')
  } finally { await saving.context.close() }
  const loading = await open({ language: 'en', profileFailure: true })
  try {
    const choice = await select(loading.page, 'Interface language')
    await loading.page.getByRole('alert').getByText(/Could not load your language preference/).waitFor()
    assert.equal(await choice.isDisabled(), true)
    await loading.page.screenshot({ path: `${output}/load-failure.png`, fullPage: true })
    assert.equal(loading.writes.length, 0)
    loading.recover()
    await loading.page.getByRole('button', { name: 'Try again' }).click()
    await assertEventually(async () => assert.equal(await choice.isDisabled(), false))
    assert.equal(await choice.inputValue(), 'en')
    await loading.page.screenshot({ path: `${output}/load-retry.png`, fullPage: true })
  } finally { await loading.context.close() }
})


async function assertEventually(check) {
  let last
  for (let i = 0; i < 80; i++) {
    try { await check(); return } catch (error) { last = error }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw last
}
