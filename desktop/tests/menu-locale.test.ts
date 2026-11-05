import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { localizeMenu, localizeNativeRoles, roleNames } from '../src/main/menu-locale';
import { desktopBrowserLocale, desktopLocale, setDesktopDateFormat, setDesktopLocale } from '../src/main/desktop-locale';
import { welcomePage } from '../src/main/welcome-page';
import { activityPage } from '../src/main/activity-page';
import { recoveryPage } from '../src/main/recovery-page';
import { DatabaseAheadError } from '../src/main/runtime';
import { connectionPage } from '../src/main/connection-page';
import { message, nativeCatalogs } from '../src/main/native-messages';
import { IntlMessageFormat } from 'intl-messageformat';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('matches supported locales without treating Traditional Chinese as Simplified', () => {
  assert.equal(desktopLocale('zh-Hans-SG'), 'zh-CN');
  assert.equal(desktopLocale('zh-TW'), 'en');
  assert.equal(desktopLocale('en-US'), 'en');
  assert.equal(desktopBrowserLocale(['fr-FR', 'zh-CN', 'en-US']), 'zh-CN');
  assert.equal(desktopBrowserLocale(['zh-TW', 'en-US', 'zh-CN']), 'en');
  assert.equal(desktopBrowserLocale(['fr-FR']), 'en');
});

test('formats ICU placeholders and falls back to source for an untranslated message', () => {
  assert.equal(message('Signed in as {account}', 'zh-CN', { account: 'user@example.invalid' }), '登录身份：user@example.invalid');
  assert.equal(message('Untranslated text', 'zh-CN'), 'Untranslated text');
  assert.equal(message('External error with {unclosed', 'zh-CN'), 'External error with {unclosed');
});

test('both local and remote desktop preloads can report the resolved interface locale', () => {
  for (const preload of ['preload.ts', 'client-preload.ts']) {
    const source = readFileSync(join(__dirname, '..', 'src', preload), 'utf8');
    assert.match(source, /setLocale:\s*locale\s*=>\s*ipcRenderer\.send\('desktop-client:locale',\s*locale\)/);
    assert.match(source, /setDateFormat:\s*format\s*=>\s*ipcRenderer\.send\('desktop-client:date-format',\s*format\)/);
    assert.match(source, /setProfileDisplay:\s*\(locale,\s*format\)\s*=>\s*ipcRenderer\.send\('desktop-client:profile-display',\s*locale,\s*format\)/);
    assert.match(source, /ipcRenderer\.send\('desktop-client:browser-languages',\s*Array\.from\(navigator\.languages\)\)/);
    assert.match(source, /if \(displayRequestPending\) \{ displayRequestPending = false; listener\(\); \}/);
  }
});

test('native translations parse as ICU and preserve every source argument', () => {
  const argumentsOf = (value: unknown, found = new Set<string>()): Set<string> => {
    if (Array.isArray(value)) value.forEach(item => argumentsOf(item, found));
    else if (value && typeof value === 'object') {
      const node = value as Record<string, unknown>;
      if (typeof node.type === 'number' && node.type >= 1 && node.type <= 6 && typeof node.value === 'string') found.add(node.value);
      Object.values(node).forEach(item => argumentsOf(item, found));
    }
    return found;
  };
  for (const [locale, messages] of Object.entries(nativeCatalogs)) {
    for (const [source, translation] of Object.entries(messages)) {
      const expected = [...argumentsOf(new IntlMessageFormat(source, 'en').getAst())].sort();
      const actual = [...argumentsOf(new IntlMessageFormat(translation, locale).getAst())].sort();
      assert.deepEqual(actual, expected, `${locale}: ${source}`);
    }
  }
});

test('native first-run, background and recovery pages render Simplified Chinese', () => {
  setDesktopLocale('zh-CN');
  try {
    assert.match(welcomePage('/book', null, 'dark'), /lang="zh-CN"[\s\S]*开始使用/);
    assert.match(welcomePage('/book', 'server', 'dark'), /连接服务器/);
    const activity = activityPage({ background: false, launchAtLogin: false }, false, false, 'dark');
    assert.match(activity, /在后台持续运行/);
    assert.match(activity, /ONW_LOGIN_SETTING_FAILED/);
    assert.doesNotMatch(activity, /includes\('Start at login'\)/);
    assert.match(recoveryPage(false), /无法启动/);
    const recovery = recoveryPage(false, null, '', 'dark', 'opening', 'https://example.invalid');
    assert.match(recovery, /将在 __seconds__ 秒后重试/);
    assert.doesNotThrow(() => new Function(recovery.match(/<script nonce="onw-recovery">([\s\S]*?)<\/script>/)![1]!));
    const newer = recoveryPage(false, new DatabaseAheadError());
    assert.match(newer, /较新版本/);
    assert.match(newer, /id="updates" class="primary"/);
    assert.match(connectionPage(null, 'dark', false, true, {}, true), /将此账本迁移到私有云/);
    assert.match(connectionPage(null, 'dark'), /class="tag">当前/);
    assert.doesNotMatch(connectionPage(null, 'dark', false, true, {}, true), /\$\{t\(/);
  } finally { setDesktopLocale('en'); }
});

test('localizes menu labels but preserves actions and user-provided account names', () => {
  const click = () => {};
  const source = [{ label: 'File', submenu: [{ label: 'New transaction', click }, { label: 'example@example.invalid' }] }];
  const result = localizeMenu(source, 'zh-CN');
  assert.equal(result[0]?.label, '文件');
  const submenu = result[0]?.submenu;
  assert.ok(Array.isArray(submenu));
  assert.equal(submenu[0]?.label, '新建交易');
  assert.equal(submenu[0]?.click, click);
  assert.equal(submenu[1]?.label, 'example@example.invalid');
  assert.equal(localizeMenu(source, 'en')[0]?.label, 'File');
});

test('localizes expanded native role labels without replacing their roles or accelerators', () => {
  const menu = { items: [{ role: 'editMenu', label: 'Edit', submenu: { items: [
    { role: 'undo', label: 'Undo', accelerator: 'CmdOrCtrl+Z' },
    { role: 'pasteAndMatchStyle', label: 'Paste and Match Style', accelerator: 'CmdOrCtrl+Shift+V' },
  ] } }] };
  localizeNativeRoles(menu, 'zh-CN', 'Open Net Worth');
  assert.equal(menu.items[0]!.label, '编辑');
  assert.deepEqual(menu.items[0]!.submenu.items.map(item => [item.role, item.label, item.accelerator]), [
    ['undo', '撤销', 'CmdOrCtrl+Z'], ['pasteAndMatchStyle', '粘贴并匹配样式', 'CmdOrCtrl+Shift+V'],
  ]);
});

test('every declared native role has a Simplified Chinese label', () => {
  for (const [role, source] of Object.entries(roleNames)) {
    assert.ok(Object.hasOwn(nativeCatalogs['zh-CN']!, source), `missing role translation: ${role}`);
  }
});

test('English leaves platform-supplied role labels unchanged', () => {
  const menu = { items: [{ role: 'quit', label: 'Quit' }] };
  localizeNativeRoles(menu, 'en', 'Open Net Worth');
  assert.equal(menu.items[0]!.label, 'Quit');
});
