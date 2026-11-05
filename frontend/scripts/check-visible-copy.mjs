// Refuse unlocalized literal JSX text and user-facing attributes. Dynamic values, translated
// descriptors and technical-only tokens are deliberately outside this lexical check.
import ts from 'typescript'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const attrs = new Set(['aria-label', 'placeholder', 'title', 'label', 'alt', 'description', 'message', 'help'])
// Exact product names, key labels and units are not prose. Keep this reviewable.
const technical = new Set(['Lucius', 'Open Net Worth', 'esc', 'ms', 'pp', '/mo', 'mo', 'OAuth', 'OpenAI', 'Claude Code', 'UTC', 'TradingView Lightweight Charts™', 'Lucius — ⌘/', 'Lucius ✦'])
const punctuation = /^(?:\d+(?:\.\d+)?|[×÷→←↑↓↵⌘⌥⇧⌫]+)$/u
// Reviewed examples, identifiers, protocol tokens, brand names and literal confirmation text.
const technicalByFile = new Set([
  "src/components/tabs/connectors/ChannelSection.tsx|https://hooks.example.com/…",
  "src/components/OnboardingWizard.tsx|sk-ant-…",
  "src/components/OnboardingWizard.tsx|sk-…",
  "src/components/firstrun/StepLucius.tsx|sk-ant-…",
  "src/components/firstrun/StepLucius.tsx|sk-…",
  "src/components/skills/SkillCompatibilityEditor.tsx|backend/** tests/**",
  "src/components/tabs/automations/AutomationConditionFields.tsx|^GRAB\\*",
  "src/components/tabs/automations/AutomationConditionFields.tsx|grabfood, ubereats",
  "src/components/tabs/connectors/AlpacaSection.tsx|PK…",
  "src/components/tabs/connectors/AlpacaSection.tsx|secret",
  "src/components/tabs/connectors/McpConnectionFields.tsx|{ \"mcpServers\": { \"my-server\": { \"command\": \"npx\", \"args\": [\"-y\", \"@vendor/server\"] } } }",
  "src/components/tabs/connectors/McpConnectionFields.tsx|API_KEY=your-key OTHER_VAR=value",
  "src/components/tabs/connectors/SimpleFinSection.tsx|aHR0cHM6Ly9iZWFyZXI6…",
  "src/components/tabs/connectors/TelegramSection.tsx|123456:ABC-DEF…",
  "src/components/tabs/connectors/VoiceSection.tsx|API…",
  "src/components/tabs/connectors/VoiceSection.tsx|secret",

  "src/components/skills/SkillCompatibilityEditor.tsx|[account] [date-range]",
  "src/components/skills/SkillCompatibilityEditor.tsx|account date_range",
  "src/components/skills/SkillCompatibilityEditor.tsx|general-purpose",
  "src/components/skills/SkillCompatibilityEditor.tsx|./assets/icon.svg",
  "src/components/skills/SkillCompatibilityEditor.tsx|./assets/logo.png",
  "src/components/skills/SkillCompatibilityEditor.tsx|streamable_http",
  "src/components/skills/SkillCompatibilityEditor.tsx|URL",

  "src/components/intel/AddNewsSourceForm.tsx|https://example.com/feed.xml",
  "src/components/intel/NewsSourcesFields.tsx|https://example.com/feed.xml",
  "src/components/intel/priceAlerts/ManageAlertsParts.tsx|https://example.com/feed.xml",
  "src/components/intel/MonitorsWorkspace.tsx|AI",
  "src/components/intel/TopicDetailModal.tsx|AI",
  "src/components/tabs/accounts/ImportModal.tsx|https://docs.google.com/…/pub?output=csv",

  "src/components/chat/toolActivity/RunCodeDetail.tsx|python",
  "src/components/firstrun/StepLucius.tsx|http://localhost:11434/v1",
  "src/components/intro/IntroPreviews.tsx|SP 500 +9.1%",
  "src/components/intro/IntroPreviews.tsx|TSLA",
  "src/components/intro/IntroPreviews.tsx|AAPL",
  "src/components/shared/DisposalForm.tsx|FIFO",
  "src/components/shared/LotsPanel.tsx|FIFO",
  "src/components/shared/LotsPanel.tsx|DRP",
  "src/components/shared/RealizedPnlPanel.tsx|FIFO",
  "src/components/tabs/automations/AutomationDetail.tsx|ONW",
  "src/components/tabs/connectors/ChannelSection.tsx|URL",
  "src/components/tabs/connectors/ChannelSection.tsx|X-Webhook-Secret",
  "src/components/tabs/connectors/EmailUnifiedSection.tsx|imap.example.com",
  "src/components/tabs/connectors/EmailUnifiedSection.tsx|smtp.example.com",
  "src/components/tabs/connectors/EmailUnifiedSection.tsx|you@example.com",
  "src/components/tabs/connectors/EmailUnifiedSection.tsx|INBOX",
  "src/components/tabs/connectors/EnableBankingSection.tsx|-----BEGIN PRIVATE KEY-----&#10;…&#10;-----END PRIVATE KEY-----",
  "src/components/tabs/connectors/EnableBankingSection.tsx|FI",
  "src/components/tabs/connectors/GoCardlessSection.tsx|GB",
  "src/components/tabs/connectors/InstitutionPickerModal.tsx|US",
  "src/components/tabs/connectors/InstitutionPickerModal.tsx|Chase, Revolut, …",
  "src/components/tabs/connectors/LunchFlowSection.tsx|lf_client_...",
  "src/components/tabs/connectors/LunchFlowSection.tsx|you@example.com",
  "src/components/tabs/connectors/McpConnectionFields.tsx|https://mcp.example.com",
  "src/components/tabs/connectors/McpConnectionFields.tsx|npx",
  "src/components/tabs/connectors/McpConnectionFields.tsx|-y @modelcontextprotocol/server-filesystem /path",
  "src/components/tabs/connectors/PlaidSection.tsx|· Client ID ••",
  "src/components/tabs/connectors/VoiceSection.tsx|LiveKit URL",
  "src/components/tabs/connectors/VoiceSection.tsx|wss://my-project.livekit.cloud",
  "src/components/tabs/connectors/YodleeSection.tsx|yodlee-client-id",
  "src/components/tabs/connectors/YodleeSection.tsx|yodlee-login-name",
  "src/components/tabs/imports/ReviewItem.tsx|Open Net Worth:",
  "src/components/tabs/imports/ReviewItem.tsx|YNAB:",
  "src/components/tabs/overview/WidgetFullscreen.tsx|https://…",
  "src/components/tabs/overview/widgets/content.tsx|https://…",
  "src/components/tabs/overview/widgets/investing.tsx|TWR",
  "src/components/tabs/settings/sections/AppearanceSection.tsx|https://…/logo.svg",
  "src/components/tabs/settings/sections/CurrencySection.tsx|English",
  "src/components/tabs/settings/sections/DataSection.tsx|RESET",
  "src/components/tabs/settings/sections/ModelSection.tsx|https://…/v1",
  "src/components/tabs/settings/sections/ShortcutsSection.tsx|https://your-address",
  "src/components/tabs/trading/TradingFiles.tsx|SHA-256",
  "src/components/tabs/trading/TradingMarketChart.tsx|· UTC",
])
const hits = []
function text(path, node, value) {
  const normalized = value.replace(/&[a-zA-Z]+;/g, '').replace(/\s+/g, ' ').trim()
  if (!normalized || !/[A-Za-z]{2}/.test(normalized) || technical.has(normalized) || technicalByFile.has(`${path}|${normalized}`) || punctuation.test(normalized)) return
  const { line } = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart())
  hits.push(`${path}:${line + 1}: ${normalized}`)
}
function walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(path)
    else if (path.endsWith('.tsx') && !/\.(?:test|spec|stories)\./.test(path) && !/(?:^|\/)(?:Gallery|ApprovalCardGallery)\.tsx$/.test(path)) {
      const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      function visit(node) {
        // This function is intentionally parked. If the guard changes, scan its copy again.
        if (path === 'src/components/tabs/plan/budget.tsx' && ts.isFunctionDeclaration(node)
          && node.name?.text === 'BudgetInsight'
          && /const HIDDEN = true\s*\n\s*if \(HIDDEN\) return null/.test(node.getText(file))) return
        // The legacy diagram hook is no longer read. Scan it again if a consumer appears.
        if (path === 'src/components/tabs/plan/budgetLens/methodsData.tsx'
          && ts.isPropertyAssignment(node) && node.name.getText(file) === 'hook'
          && !methodHookUsed) return
        if (ts.isJsxText(node)) text(path, node, node.text)
        if (ts.isJsxAttribute(node) && attrs.has(node.name.getText(file)) && node.initializer && ts.isStringLiteral(node.initializer)) text(path, node, node.initializer.text)
        if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent) || (ts.isJsxAttribute(node.parent) && attrs.has(node.parent.name.getText(file))))) {
          function rendered(expr) {
            if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) text(path, expr, expr.text)
            else if (ts.isConditionalExpression(expr)) { rendered(expr.whenTrue); rendered(expr.whenFalse) }
            else if (ts.isBinaryExpression(expr) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expr.operatorToken.kind)) {
              if (expr.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) rendered(expr.left)
              rendered(expr.right)
            }
            else if (ts.isTemplateExpression(expr)) {
              text(path, expr.head, expr.head.text)
              for (const span of expr.templateSpans) text(path, span.literal, span.literal.text)
            }
            else if (ts.isParenthesizedExpression(expr)) rendered(expr.expression)
          }
          rendered(node.expression)
        }
        ts.forEachChild(node, visit)
      }
      visit(file)
    }
  }
}
function hasMethodHookUse(dir) {
  return readdirSync(dir, { withFileTypes: true }).some((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return hasMethodHookUse(path)
    if (!/\.tsx?$/.test(path) || /(?:methodsData|\.test|\.spec)\./.test(path)) return false
    return /(?:\.hook\b|\[['"]hook['"]\]|\{[^}]*\bhook\b[^}]*\}\s*=)/.test(readFileSync(path, 'utf8'))
  })
}
const methodHookUsed = hasMethodHookUse('src/components/tabs/plan/budgetLens')
walkFiles(process.argv[2] || 'src')
if (hits.length) {
  process.stderr.write(`${hits.join('\n')}\n${hits.length} visible literal(s) need translation or a reviewed technical exception.\n`)
  process.exitCode = 1
} else process.stdout.write('No unlocalized visible literals found.\n')
