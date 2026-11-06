import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setDesktopDateFormat, setDesktopLocale } from '../src/main/desktop-locale';
import { detailOf } from '../src/main/move-endpoint';
import { moveMessage, moveMessages } from '../src/main/move-messages';
import { nativeCatalogs } from '../src/main/native-messages';
import { checklistCopy, movedBanner, movedDetail, whenText } from '../src/main/hosted-move';

test('desktop move translations cover the backend message contract and parameters', () => {
  const contract = JSON.parse(readFileSync(join(__dirname, '..', '..', 'backend', 'core', 'move_message_contract.json'), 'utf8')) as Record<string, string[]>;
  assert.deepEqual(Object.keys(moveMessages).sort(), Object.keys(contract).sort());
  for (const [id, entry] of Object.entries(moveMessages)) {
    assert.deepEqual(entry.parameter ? [entry.parameter] : [], contract[id], id);
    assert.ok(Object.hasOwn(nativeCatalogs['zh-CN']!, entry.text), `missing zh-CN: ${id}`);
  }
});

test('desktop checklist translations cover the backend checklist contract', () => {
  const contract = JSON.parse(readFileSync(join(__dirname, '..', '..', 'backend', 'core', 'move_checklist_contract.json'), 'utf8')) as string[];
  assert.deepEqual(Object.keys(checklistCopy).sort(), [...contract].sort());
  for (const [id, copy] of Object.entries(checklistCopy)) {
    assert.ok(Object.hasOwn(nativeCatalogs['zh-CN']!, copy.title), `missing title: ${id}`);
    assert.ok(Object.hasOwn(nativeCatalogs['zh-CN']!, copy.fix), `missing fix: ${id}`);
  }
});

test('known move codes localize with validated parameters; unknown input stays original', () => {
  setDesktopLocale('zh-CN');
  try {
    assert.equal(detailOf({ status: 409, body: { detail: 'original', message_id: 'move.rate_limited', message_params: { retry_seconds: 12 } } }, 'fallback'), '发起的迁移任务过多，请在 12 秒后重试');
    for (const params of [{ retry_seconds: -1 }, { retry_seconds: '12' }, { retry_seconds: 1.5 }, { retry_seconds: Number.MAX_SAFE_INTEGER + 1 }, { retry_seconds: 12, extra: 'x' }]) {
      assert.equal(detailOf({ status: 409, body: { detail: 'original', message_id: 'move.rate_limited', message_params: params } }, 'fallback'), 'original');
    }
    assert.equal(moveMessage({ message_id: '__proto__', message_params: {} }), null);
    assert.equal(detailOf({ status: 409, body: { detail: 'external {unchanged}', message_id: 'move.unrecognized', message_params: {} } }, 'fallback'), 'external {unchanged}');
    assert.equal(moveMessage({ message_id: 'move.import_failed', message_params: {} }), '导入未完成。请检查服务器后重试。');
  } finally { setDesktopLocale('en'); }
});

test('checklist localizes only known ids and preserves user-supplied detail and unknown items', () => {
  setDesktopLocale('zh-CN');
  try {
    const output = movedDetail([
      { id: 'local_model', title: 'ignored', fix: 'ignored', detail: 'Example model' },
      { id: 'future_id', title: 'external title', fix: 'external fix', detail: 'Original detail' },
    ], 'to-cloud');
    assert.match(output, /此电脑上的模型 \(Example model\)/);
    assert.match(output, /external title \(Original detail\): external fix/);
  } finally { setDesktopLocale('en'); }
});

test('moved-copy warning follows the selected locale', () => {
  setDesktopLocale('zh-CN');
  try {
    const banner = movedBanner('2026-11-05T00:00:00Z');
    assert.match(banner.text, /在此所做的更改不会出现在私有云中/);
    assert.equal(banner.openLabel, '打开私有云');
  } finally { setDesktopLocale('en'); }
});

test('native dates follow profile format independently of interface language', () => {
  const iso = '2026-11-05T12:00:00Z';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const date = new Date(iso);
  try {
    setDesktopDateFormat(null);
    assert.equal(whenText(iso), date.toLocaleDateString(undefined, options));
    setDesktopDateFormat('mdy');
    setDesktopLocale('zh-CN');
    assert.equal(whenText(iso), date.toLocaleDateString('en-US', options));
    setDesktopLocale('en');
    assert.equal(whenText(iso), date.toLocaleDateString('en-US', options));
    setDesktopDateFormat('dmy');
    assert.equal(whenText(iso), date.toLocaleDateString('en-GB', options).replace(/\bSept\b/, 'Sep'));
    setDesktopDateFormat('iso');
    assert.equal(whenText(iso), date.toLocaleDateString('en-GB', options).replace(/\bSept\b/, 'Sep'));
  } finally { setDesktopDateFormat(null); setDesktopLocale('en'); }
});
