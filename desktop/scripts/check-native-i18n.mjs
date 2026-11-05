// Checks literal text in native HTML templates. It does not infer the provenance of dynamic
// expressions or strings assigned by embedded JavaScript; those require inventory and tests.
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'src', 'main');
const allowed = new Set(['Open Net Worth', '— Open Net Worth']);
const allowedAttributes = new Set(['ABCD-2345', 'https://onw.example.com']);
const errors = [];
const hasLanguageText = value => /\p{L}/u.test(value);
const catalogSource = ts.createSourceFile('native-messages.ts', readFileSync(join(root, 'native-messages.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const translated = new Set();
function readCatalog(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'nativeCatalogs' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
    const chinese = node.initializer.properties.find(prop => ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.name) && prop.name.text === 'zh-CN');
    if (!chinese || !ts.isPropertyAssignment(chinese) || !ts.isObjectLiteralExpression(chinese.initializer)) throw new Error('Missing zh-CN native catalog');
    for (const prop of chinese.initializer.properties) if (ts.isPropertyAssignment(prop) && (ts.isStringLiteral(prop.name) || ts.isIdentifier(prop.name))) translated.add(prop.name.text);
  }
  ts.forEachChild(node, readCatalog);
}
readCatalog(catalogSource);
if (!translated.size) throw new Error('Native zh-CN catalog was not found or is empty');

function checkFragment(fragment, file, line) {
  if (!/<[a-z][\w:-]*[\s/>]/i.test(fragment)) return;
  const html = fragment.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const match of html.matchAll(/>([^<>]+)</g)) {
    const value = match[1].replace(/__ONW_EXPR__/g, '').replace(/&(?:nbsp|amp);/g, ' ').trim();
    if (hasLanguageText(value) && !allowed.has(value)) errors.push(`${file}:${line}: text ${JSON.stringify(value)}`);
  }
  for (const match of html.matchAll(/\b(?:aria-label|placeholder|title)\s*=\s*["']([^"']+)["']/gi)) {
    const value = match[1].replace(/__ONW_EXPR__/g, '').trim();
    if (hasLanguageText(value) && !allowed.has(value) && !allowedAttributes.has(value)) errors.push(`${file}:${line}: attribute ${JSON.stringify(value)}`);
  }
}

function checkDomAssignment(node, source, file) {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && ['textContent', 'innerText'].includes(node.left.name.text) && ts.isStringLiteral(node.right) && hasLanguageText(node.right.text)) {
    errors.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: hard-coded DOM text ${JSON.stringify(node.right.text)}`);
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'createTextNode' && node.arguments.length && ts.isStringLiteral(node.arguments[0]) && hasLanguageText(node.arguments[0].text)) {
    errors.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: hard-coded DOM text ${JSON.stringify(node.arguments[0].text)}`);
  }
}

// Guard the guard against silently accepting literal copy or flagging translated expressions.
checkFragment('<button>Untranslated warning</button>', 'self-test', 1);
if (errors.length !== 1) throw new Error('Native i18n check failed its literal-text self-test');
errors.length = 0;
checkFragment('<button>__ONW_EXPR__</button>', 'self-test', 1);
if (errors.length !== 0) throw new Error('Native i18n check failed its translated-expression self-test');
checkFragment('<input aria-label="Untranslated label">', 'self-test', 1);
if (errors.length !== 1) throw new Error('Native i18n check failed its attribute self-test');
errors.length = 0;
checkFragment('<input placeholder="SAVE">', 'self-test', 1);
if (errors.length !== 1) throw new Error('Native i18n check failed its uppercase self-test');
errors.length = 0;
checkFragment('<button>未翻译</button>', 'self-test', 1);
if (errors.length !== 1) throw new Error('Native i18n check failed its non-English self-test');
errors.length = 0;
const domFixture = ts.createSourceFile('self-test.ts', "node.textContent = 'Untranslated label'", ts.ScriptTarget.Latest, true);
const checkFixture = node => { checkDomAssignment(node, domFixture, 'self-test'); ts.forEachChild(node, checkFixture); };
checkFixture(domFixture);
if (errors.length !== 1) throw new Error('Native i18n check failed its DOM text self-test');
errors.length = 0;
const textFixture = ts.createSourceFile('self-test.ts', "document.createTextNode('Untranslated text')", ts.ScriptTarget.Latest, true);
const checkTextFixture = node => { checkDomAssignment(node, textFixture, 'self-test'); ts.forEachChild(node, checkTextFixture); };
checkTextFixture(textFixture);
if (errors.length !== 1) throw new Error('Native i18n check failed its DOM node self-test');
errors.length = 0;

const paths = [
  ...readdirSync(root).filter(name => name.endsWith('.ts')).map(name => join(root, name)),
  ...['preload.ts', 'client-preload.ts', 'activity-preload.ts', 'report-preload.ts'].map(name => resolve(root, '..', name)),
];
for (const path of paths) {
  const file = path.slice(resolve(root, '..').length + 1).replaceAll('\\', '/');
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const aliases = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== './native-messages') continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const entry of bindings.elements) {
      if ((entry.propertyName?.text ?? entry.name.text) === 'message') aliases.add(entry.name.text);
    }
  }
  const visit = node => {
    if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteral(node)) checkFragment(node.text, file, source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    else if (ts.isTemplateExpression(node)) {
      const fragment = node.head.text + node.templateSpans.map(span => `__ONW_EXPR__${span.literal.text}`).join('');
      checkFragment(fragment, file, source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && aliases.has(node.expression.text) && node.arguments.length) {
      const argument = node.arguments[0];
      if ((ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) && !translated.has(argument.text)) {
        errors.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: missing zh-CN ${JSON.stringify(argument.text)}`);
      }
    }
    if (['main/app-menu.ts', 'main/index.ts'].includes(file) && ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && node.name.text === 'label' && ts.isStringLiteral(node.initializer)) {
      const value = node.initializer.text;
      if (value !== 'Lucius' && !translated.has(value)) errors.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: missing menu label ${JSON.stringify(value)}`);
    }
    checkDomAssignment(node, source, file);
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (errors.length) { process.stderr.write(`Unlocalized literal text in native templates:\n${errors.join('\n')}\n`); process.exitCode = 1; }
else process.stdout.write('Native HTML literal and static catalog checks passed. Dynamic expressions, embedded scripts and platform-generated text require separate review.\n');
