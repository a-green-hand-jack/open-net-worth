import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse, TYPE } from '@formatjs/icu-messageformat-parser'

const extraction = spawnSync(
    process.execPath,
    [
      'node_modules/@formatjs/cli/bin/formatjs',
      'extract',
      'src/**/*.{ts,tsx}',
      '--ignore',
      '**/*.test.*',
      '--ignore',
      '**/*.spec.*',
      '--format',
      'simple',
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
)
if (extraction.error || extraction.status !== 0 || extraction.stderr.trim()) {
  process.stderr.write(extraction.stderr || `${extraction.error || 'Message extraction failed'}\n`)
  process.exit(1)
}
const source = JSON.parse(extraction.stdout)
const catalogFiles = [
  'src/i18n/zh-CN.json',
  'src/components/tabs/trading/zh-CN.messages.json',
  'src/components/tabs/accounts/zh-CN.messages.json',
  'src/components/tabs/accounts/visible.zh-CN.messages.json',
  'src/components/tabs/plan/zh-CN.messages.json',
  'src/components/tabs/plan/visible-scan.zh-CN.messages.json',
  'src/components/tabs/connectors/zh-CN.messages.json',
  'src/components/chat/zh-CN.messages.json',
  'src/components/tabs/overview/zh-CN.messages.json',
  'src/components/intel/zh-CN.messages.json',
  'src/components/tabs/builder.zh-CN.messages.json',
  'src/components/tabs/automations/zh-CN.messages.json',
  'src/components/skills/zh-CN.messages.json',
  'src/components/tabs/imports/zh-CN.messages.json',
  'src/components/tabs/settings/remaining.zh-CN.messages.json',
  'src/components/shared/zh-CN.messages.json',
  'src/components/tabs/equity/zh-CN.messages.json',
  'src/components/firstrun/zh-CN.messages.json',
  'src/components/tabs/investments/zh-CN.messages.json',
  'src/components/vault/zh-CN.messages.json',
  'src/components/remaining-a11y.zh-CN.messages.json',
  'src/components/scan-fixes.zh-CN.messages.json',
  'src/components/scan2.zh-CN.messages.json',
  'src/components/visible-scan2.zh-CN.messages.json',
]
const localeConfig = JSON.parse(readFileSync('../backend/core/interface_locales.json', 'utf8'))
const translatedLocales = localeConfig.map((entry) => entry.id).filter((id) => id !== 'en')
const translations = Object.fromEntries(translatedLocales.map((id) => [id, {}]))
const errors = []
// Tool names are explicit literals in the registry decorators. Refuse unrecognised
// decorator shapes rather than silently omitting a newly registered tool.
const toolDisplaySource = readFileSync('src/components/chat/toolActivity/localizedDisplay.ts', 'utf8')
const toolDescriptors = new Set([...toolDisplaySource.matchAll(/id:\s*['"]chat\.tool\.action\.([a-z0-9_]+)['"]/g)].map((match) => match[1]))
toolDescriptors.add('apply_budget_operation') // Its operation identifies the displayed message.
for (const file of readdirSync('../backend/ai/tools').filter((file) => file.endsWith('.py'))) {
  const text = readFileSync(join('../backend/ai/tools', file), 'utf8')
  const decoratorCount = [...text.matchAll(/^@tool\s*\(/gm)].length
  const names = [...text.matchAll(/^@tool\s*\(\s*['"]([a-z0-9_]+)['"]/gm)].map((match) => match[1])
  if (file === 'describe.py' && /^_SELF\s*=\s*['"]describe['"]/m.test(text) && /^@tool\s*\(\s*name\s*=\s*_SELF\s*,/m.test(text)) names.push('describe')
  if (names.length !== decoratorCount) errors.push(`${file}: tool registration is not a literal name`)
  for (const name of names) if (!toolDescriptors.has(name)) errors.push(`${name}: tool display has no translation descriptor`)
}
const toolDisplayBackend = readFileSync('../backend/ai/tools/display.py', 'utf8')
const budgetMap = toolDisplayBackend.match(/_BUDGET_OPERATION_LABELS\s*=\s*\{([\s\S]*?)\n\}/)
if (!budgetMap) errors.push('budget operation display registry not found')
else for (const match of budgetMap[1].matchAll(/^\s*["']([a-z0-9_]+)["']\s*:/gm)) {
  if (!Object.hasOwn(source, `chat.tool.budget.${match[1]}`)) errors.push(`${match[1]}: budget operation has no translation descriptor`)
}
const backendFiles = [
  ...readdirSync('../backend/services/trading')
    .filter((file) => file.endsWith('.py'))
    .map((file) => join('../backend/services/trading', file)),
  '../backend/db/trading_store.py',
]
const backendIds = new Set([
  'trading.error.ibkr_schema_review_required',
  'trading.error.ibkr_connection_required',
  'trading.error.ibkr_connection_disabled',
  'trading.error.ibkr_oauth_required',
  'trading.error.ibkr_connection_check_required',
])
for (const path of backendFiles) {
  const contents = readFileSync(path, 'utf8')
  for (const match of contents.matchAll(
    /(?:message_id\s*=\s*|notice\(\s*)["'](trading\.(?:error|notice)\.[a-z0-9_]+)["']/g,
  )) {
    backendIds.add(match[1])
  }
}
for (const id of backendIds) {
  if (!Object.hasOwn(source, id)) errors.push(`${id}: backend message has no frontend descriptor`)
}
for (const path of [
  '../backend/db/sql_console_role.py', '../backend/ai/memory_import.py',
  '../backend/services/ledger.py', '../backend/services/tracking_start.py', '../backend/services/statements/structured.py',
  '../backend/services/statements/tiers.py', '../backend/services/statements/importer.py',
  '../backend/services/statements/decisions.py', '../backend/services/import_csv.py',
  '../backend/services/import_qif.py', '../backend/services/import_ofx.py',
  '../backend/services/import_camt.py', '../backend/services/import_mt940.py',
  '../backend/services/audit.py',
  '../backend/services/cashflow.py',
  '../backend/services/risk_metrics.py',
  '../backend/services/cash_flow_graph.py',
  '../backend/services/connectors.py', '../backend/api/connectors_api.py',
  '../backend/ai/permission_api_v2.py',
  '../backend/api/connector_error_responses.py', '../backend/services/aggregation/plaid.py',
]) {
  const contents = readFileSync(path, 'utf8')
  for (const match of contents.matchAll(/["']((?:(?:sqlAccess|memoryImport)\.reason|statement\.skip|ledger\.(?:bulk|warning)|audit\.(?:actor|source|via)|cashflow\.(?:label|category|note)|performance\.risk|moneyFlow\.label|connector\.error|permissions\.error)\.[a-zA-Z0-9_]+)["']/g)) {
    if (!Object.hasOwn(source, match[1])) errors.push(`${match[1]}: backend message has no frontend descriptor`)
  }
}
for (const path of [
  '../backend/services/matching.py',
  '../backend/services/portfolio_brief.py',
  '../backend/services/inbox.py',
  '../backend/services/notify.py',
  '../backend/services/automations/executors.py',
  '../backend/services/lot_integrity.py',
  '../backend/services/position_figures.py',
  '../backend/ai/cli_probe.py',
  '../backend/ai/capture.py',
  '../backend/ai/_confirm_gate.py',
  '../backend/ai/_confirm_gate_v2.py',
]) {
  const contents = readFileSync(path, 'utf8')
  for (const match of contents.matchAll(/["']((?:matching|portfolio|inbox\.server)\.[a-zA-Z0-9_]+)["']/g)) {
    if (!Object.hasOwn(source, match[1]))
      errors.push(`${match[1]}: backend message has no frontend descriptor`)
  }
}
// Import diagnostics are generated at validation sites and passed through unchanged when
// unknown. Require every application-owned ID to have a static descriptor.
for (const path of ['../backend/services/portability.py', '../backend/api/portability.py', '../backend/db/money_io.py', '../backend/db/portable_bridge.py']) {
  for (const match of readFileSync(path, 'utf8').matchAll(/["'](restore\.(?:error|warning)\.[A-Za-z0-9_]+)["']/g)) {
    if (!Object.hasOwn(source, match[1])) errors.push(`${match[1]}: import diagnostic has no frontend descriptor`)
  }
}
for (const locale of translatedLocales) {
  for (const template of catalogFiles) {
    const path = template.replace('zh-CN', locale)
    if (!existsSync(path)) {
      errors.push(`${locale}: catalog missing: ${path}`)
      continue
    }
    const catalog = JSON.parse(readFileSync(path, 'utf8'))
    for (const [id, message] of Object.entries(catalog)) {
      if (Object.hasOwn(translations[locale], id)) errors.push(`${locale}: ${id}: duplicate translation key`)
      translations[locale][id] = message
    }
  }
}

function argumentsIn(message) {
  const args = new Set()
  function visit(elements) {
    for (const element of elements) {
      if (element.type !== TYPE.literal && element.type !== TYPE.pound) {
        args.add(`${element.value}:${element.type}`)
      }
      if (element.type === TYPE.tag) visit(element.children)
      if (element.type === TYPE.plural || element.type === TYPE.select) {
        for (const option of Object.values(element.options)) visit(option.value)
      }
    }
  }
  visit(parse(message))
  return [...args].sort().join(',')
}

for (const locale of translatedLocales) {
  for (const [id, english] of Object.entries(source)) {
    const translation = translations[locale][id]
    if (typeof translation !== 'string' || !translation.trim()) {
      errors.push(`${locale}: ${id}: missing translation`)
      continue
    }
    try {
      if (argumentsIn(english) !== argumentsIn(translation))
        errors.push(`${locale}: ${id}: placeholder mismatch`)
    } catch (error) {
      errors.push(`${locale}: ${id}: invalid ICU message (${error.message})`)
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Validated ${Object.keys(source).length} extracted messages`)
}
