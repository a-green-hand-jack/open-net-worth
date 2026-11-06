import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Every API is fulfilled locally: no customer book, network provider, or real profile is read.
const appUrl = process.env.APP_URL || 'http://127.0.0.1:8096'
const url = new URL(appUrl)
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && Number(url.port) >= 8090 && Number(url.port) <= 8099, 'An isolated QA port is required')
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8097'
const output = resolve('qa/browser-use/artifacts/interface-language')
mkdirSync(output, { recursive: true })
let browser
before(async () => { browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined), args: ['--no-sandbox'] }) })
after(async () => { await browser?.close() })

async function open({ locale = 'en-US', language = null, profileFailure = false, saveFailure = false, viewport = { width: 1440, height: 900 }, realProfile = false } = {}) {
  const context = await browser.newContext({ locale, viewport, serviceWorkers: 'block' })
  let profile = { language, base_currency: 'USD', number_format: 'comma', date_format: 'mdy', timezone: 'UTC', seen_intros: [] }
  let failRead = profileFailure
  const writes = []
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (realProfile && path === '/api/market-ticker') return json({ rows: [
      { symbol: 'GC=F', label: 'Gold', label_source: 'gold', kind: 'commodity', unit: 'USD', price: 4691.5, change_pct: 0.23 },
      { symbol: 'SI=F', label: 'Silver', label_source: 'silver', kind: 'commodity', unit: 'USD', price: 31.25, change_pct: -0.04 },
      { symbol: 'CUSTOM', label: 'Gold', kind: 'equity', unit: 'USD', price: 12.34, change_pct: null },
    ] })
    if (realProfile && path === '/api/reports/rollup') {
      const expense = [{ key: 'qa_food', label: 'QA Market 123', color: '', amount: 52.11 }]
      const income = [{ key: 'qa_income', label: 'QA Salary', color: '', amount: 8000 }]
      const point = { ym: '2026-11', expense_rows: expense, expense_total: 52.11, income_rows: income, income_total: 8000 }
      const totals = (value) => ({ current: value, average: value, total: value })
      return json({ base_currency: 'USD', months: ['2026-11'], points: [point], current: point,
        expense_series: expense.map((r) => ({ ...r, data: [r.amount] })), income_series: income.map((r) => ({ ...r, data: [r.amount] })),
        expense_table: expense.map((r) => ({ ...r, ...totals(r.amount) })), income_table: income.map((r) => ({ ...r, ...totals(r.amount) })),
        expense_totals: totals(52.11), income_totals: totals(8000), net_totals: totals(7947.89), avg_monthly_spend: 52.11, net_total: 7947.89,
        spending_month: '2026-11', current_month: '2026-11', merchants: [{ key: 'qa_merchant', label: 'QA Market 123', amount: 52.11, pct: 100 }],
        savings: { ym: '2026-11', income: 8000, spent: 52.11, saved: 7947.89, rate_pct: 99.35, known: true } })
    }
    if (path === '/api/profile' && realProfile) {
      const response = await fetch(`${backendUrl}${path}`, { method: request.method(), headers: { 'Content-Type': 'application/json' }, body: request.method() === 'PUT' ? request.postData() : undefined })
      return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() })
    }
    if (path === '/api/profile' && request.method() === 'PUT') {
      writes.push(request.postDataJSON())
      if (saveFailure) return json({ detail: 'Synthetic save failure' }, 503)
      profile = { ...profile, ...request.postDataJSON() }
      return json({ profile })
    }
    if (path === '/api/profile' && request.method() === 'GET') {
      if (failRead) return json({ detail: 'Synthetic profile failure' }, 503)
      return json(profile)
    }
    if (path === '/api/auth/status') return json({ required: false, authenticated: true })
    if (path === '/api/setup-status') return json({ is_fresh: false, restore_pending: false, book_id: 'synthetic-language-qa' })
    if (realProfile && path !== '/api/events' && request.method() === 'GET') {
      const response = await fetch(`${backendUrl}${new URL(request.url()).pathname}${new URL(request.url()).search}`)
      return route.fulfill({ status: response.status, contentType: response.headers.get('content-type') || 'application/json', body: await response.text() })
    }
    if (path === '/api/feature-flags') return json({}, 503)
    if (path === '/api/events') return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    if (['/api/accounts', '/api/intel/signals', '/api/connectors', '/api/sessions', '/api/sessions/live', '/api/models', '/api/matches/reviews'].includes(path)) return json([])
    return json({ items: [], accounts: [], positions: [], rows: [], total: 0 })
  })
  const page = await context.newPage()
  await page.goto(`${appUrl}/settings?sub=currency`, { waitUntil: 'domcontentloaded' })
  return { page, context, writes, recover: () => { failRead = false }, profile: () => profile }
}

async function select(page, name) {
  const choice = page.getByLabel(name, { exact: true })
  try { await choice.waitFor({ state: 'visible', timeout: 8000 }) } catch (error) { if (await page.getByText('Show Error').count()) await page.getByText('Show Error').click(); console.error('PAGE', page.url(), (await page.locator('body').innerText()).slice(0, 3000)); throw error }
  return choice
}

test('LANG-PROFILE: profile wins and changes persist across reload', async () => {
  const app = await open({ locale: 'en-US', language: 'zh-CN' })
  try {
    const choice = await select(app.page, '界面语言')
    await assertEventually(async () => assert.equal(await choice.inputValue(), 'zh-CN'))
    await app.page.screenshot({ path: `${output}/profile-zh.png`, fullPage: true })
    const currency = app.page.locator('select').filter({ has: app.page.locator('option[value=SGD]') })
    await currency.selectOption('SGD')
    const confirmation = app.page.getByRole('dialog')
    await confirmation.getByText('将基础货币切换为 SGD？').waitFor()
    await app.page.screenshot({ path: `${output}/currency-confirm-zh.png`, fullPage: true })
    await confirmation.getByRole('button', { name: '取消' }).click()
    assert.equal(app.writes.length, 0)
    await choice.selectOption('en')
    await assertEventually(() => assert.equal(app.profile().language, 'en'))
    await app.page.getByText('Language updated', { exact: true }).waitFor()
    await select(app.page, 'Interface language')
    await app.page.screenshot({ path: `${output}/profile-en.png`, fullPage: true })
    await app.page.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await (await select(app.page, 'Interface language')).inputValue(), 'en')
    assert.deepEqual(app.writes.at(-1), { language: 'en' })
    await (await select(app.page, 'Interface language')).selectOption('zh-CN')
    await assertEventually(() => assert.equal(app.profile().language, 'zh-CN'))
    await app.page.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await (await select(app.page, '界面语言')).inputValue(), 'zh-CN')
    assert.equal(await app.page.locator('option[value=USD]').textContent(), 'USD — 美元')
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
    await saving.page.getByText('Synthetic save failure').waitFor()
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


test('LANG-REAL: profile choice persists in the isolated backend after browser reload', async () => {
  assert.equal(process.env.ONW_SYNTHETIC_PROFILE_QA, '1', 'Requires an explicitly synthetic QA book')
  const backend = new URL(backendUrl)
  assert.ok(['localhost', '127.0.0.1'].includes(backend.hostname) && Number(backend.port) >= 8090 && Number(backend.port) <= 8099)
  assert.ok(process.env.ONW_QA_NONCE)
  const attested = await fetch(`${backendUrl}/api/qa/attest`, { headers: { 'X-ONW-QA-Nonce': process.env.ONW_QA_NONCE } })
  assert.equal(attested.status, 200)
  const reset = await fetch(`${backendUrl}/api/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'en', date_format: null, number_format: 'comma' }) })
  assert.equal(reset.status, 200)
  const app = await open({ locale: 'en-US', realProfile: true })
  try {
    const choice = await select(app.page, 'Interface language')
    await choice.selectOption('zh-CN')
    await select(app.page, '界面语言')
    const response = await fetch(`${backendUrl}/api/profile`)
    assert.equal((await response.json()).language, 'zh-CN')
    await app.page.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await (await select(app.page, '界面语言')).inputValue(), 'zh-CN')
    await app.page.screenshot({ path: `${output}/real-profile-reload.png`, fullPage: true })
    for (const [route, label] of [['/dashboard', 'dashboard'], ['/accounts', 'accounts'], ['/plan', 'plan'], ['/investments', 'investments']]) {
      await app.page.goto(`${appUrl}${route}`, { waitUntil: 'domcontentloaded' })
      if (label === 'dashboard') await app.page.getByRole('tab', { name: '概览', exact: true }).click({ timeout: 30000 })
      await assertEventually(async () => assert.equal(await app.page.locator('html').getAttribute('lang'), 'zh-CN'))
      await app.page.waitForTimeout(1200)
      const marker = { dashboard: '净资产', accounts: 'Everyday Checking', plan: '预算', investments: 'Vanguard S&P 500 ETF' }[label]
      await app.page.getByText(marker, { exact: false }).first().waitFor({ timeout: 30000 })
      if (label === 'dashboard') {
        await app.page.getByRole('tab', { name: '报告' }).waitFor({ timeout: 30000 })
        await app.page.locator('.ov-chart-skeleton').first().waitFor({ state: 'hidden', timeout: 60000 })
        await app.page.locator('.ov-hero-nw').first().waitFor({ timeout: 30000 })
        await app.page.locator('.ov-upcoming-date').first().waitFor({ timeout: 30000 })
        const upcomingDates = await app.page.locator('.ov-upcoming-date').allTextContents()
        assert.ok(upcomingDates.some((date) => /\d+月\d+日/.test(date)), `Upcoming dates did not follow Chinese: ${upcomingDates}`)
      }
      if (label === 'plan') {
        await app.page.getByText('正在加载预算…').waitFor({ state: 'hidden', timeout: 30000 })
        const month = app.page.locator('.pl-sum-row .pl-mnav .lbl')
        assert.equal(await month.innerText(), '2026年11月')
        const fits = await month.evaluate((el) => el.scrollWidth <= el.clientWidth)
        assert.ok(fits, 'Budget month is truncated')
      }
      if (label === 'accounts') {
        const done = app.page.getByRole('button', { name: '完成', exact: true })
        if (await done.isVisible()) await done.click()
      }
      const intro = app.page.getByRole('dialog').filter({ has: app.page.getByRole('button', { name: '关闭', exact: true }) })
      if (await intro.count()) {
        await app.page.screenshot({ path: `${output}/${label}-intro-zh.png`, fullPage: true })
        await intro.getByRole('button', { name: '关闭', exact: true }).click()
      }
      const body = await app.page.locator('body').innerText()
      const required = { dashboard: ['概览', '净资产', '报告'], accounts: ['账户', 'Everyday Checking', 'Kopi Lane', '11/05/2026', '$9.54'], plan: ['规划', '预算', '资金不足', '有可用资金', 'Sapphire Card', '$600.00'], investments: ['投资', '所有账户的股票、ETF、加密货币和大宗商品', 'Vanguard S&P 500 ETF', '$604.00'] }[label]
      for (const value of required) assert.ok(body.includes(value), `${route} missing expected content: ${value}`)
      assert.ok(!body.includes('Something went wrong!') && !body.includes('出现问题。'), `${route} showed an error boundary`)
      await app.page.screenshot({ path: `${output}/${label}-zh.png`, fullPage: true })
      if (label === 'dashboard') {
        await app.page.getByRole('tab', { name: '报告' }).click()
        await app.page.locator('.ov-ranked-row').first().waitFor({ timeout: 30000 })
        const reports = await app.page.locator('body').innerText()
        assert.ok(reports.includes('按类别支出') && reports.includes('主要商家') && reports.includes('QA Market 123'))
        assert.ok(reports.includes('$52.11'))
        await app.page.screenshot({ path: `${output}/reports-zh.png`, fullPage: true })
      }
    }
    await app.page.goto(`${appUrl}/settings?sub=currency`, { waitUntil: 'domcontentloaded' })
    const dateFormat = app.page.locator('select').filter({ has: app.page.locator('option[value=dmy]') })
    await dateFormat.waitFor({ timeout: 30000 })
    await dateFormat.selectOption('dmy')
    await assertEventually(async () => {
      const response = await fetch(`${backendUrl}/api/profile`)
      assert.equal((await response.json()).date_format, 'dmy')
    })
    await app.page.goto(`${appUrl}/dashboard`, { waitUntil: 'domcontentloaded' })
    await app.page.getByRole('tab', { name: '概览', exact: true }).click({ timeout: 30000 })
    await app.page.locator('.ov-upcoming-date').first().waitFor({ timeout: 30000 })
    await assertEventually(async () => {
      const dates = await app.page.locator('.ov-upcoming-date').allTextContents()
      assert.ok(dates.some((date) => /\d+日\d+月/.test(date)), `Day-first dates did not retain Chinese: ${dates}`)
    })
    await app.page.locator('.ov-chart-skeleton').first().waitFor({ state: 'hidden', timeout: 60000 })
    await app.page.screenshot({ path: `${output}/dashboard-zh-dmy.png`, fullPage: true })
  } finally { await app.context.close() }
})

test('LANG-MARKET: marked commodity names and numeric preference render without changing external names', async () => {
  assert.equal(process.env.ONW_SYNTHETIC_PROFILE_QA, '1')
  const backend = new URL(backendUrl)
  assert.ok(['localhost', '127.0.0.1'].includes(backend.hostname) && Number(backend.port) >= 8090 && Number(backend.port) <= 8099)
  const attested = await fetch(`${backendUrl}/api/qa/attest`, { headers: { 'X-ONW-QA-Nonce': process.env.ONW_QA_NONCE } })
  assert.equal(attested.status, 200)
  const saved = await fetch(`${backendUrl}/api/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'zh-CN', number_format: 'dot' }) })
  assert.equal(saved.status, 200)
  const app = await open({ locale: 'en-US', realProfile: true })
  try {
    const strip = app.page.locator('.ticker')
    await strip.getByText('黄金', { exact: true }).first().waitFor({ timeout: 30000 })
    assert.ok(await strip.getByText('白银', { exact: true }).count())
    assert.ok(await strip.getByText('Gold', { exact: true }).count())
    assert.ok(await strip.getByText('4.692', { exact: true }).count())
    assert.ok((await strip.innerText()).includes('0,23%'))
    await strip.screenshot({ path: `${output}/market-ticker-zh-dot.png` })
  } finally { await app.context.close() }
})

async function assertEventually(check) {
  let last
  for (let i = 0; i < 80; i++) {
    try { await check(); return } catch (error) { last = error }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw last
}
