import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { MenuItemConstructorOptions } from 'electron';
import { goMenu, helpMenu, newItems, privateCloudItems, viewMenu, windowMenu } from '../src/main/app-menu';
import { nativeCatalogs } from '../src/main/native-messages';

test('every application-owned native menu label has a Chinese translation', () => {
  const noop = () => {};
  const actions = { signIn: noop, moveBook: noop, switchAccount: noop, signOut: noop, moveBack: noop };
  const menus: MenuItemConstructorOptions[] = [
    ...newItems(noop),
    ...privateCloudItems(true, { local: true, signedIn: true }, actions),
    ...privateCloudItems(true, { local: true, signedIn: false }, actions),
    viewMenu('linux', { send: noop, reload: noop, serverMode: false }),
    goMenu('linux', { canGoBack: true, canGoForward: true }, noop),
    windowMenu('linux', noop),
    helpMenu('linux', { send: noop, checkForUpdates: { label: 'Check for Updates…' }, serverMode: false, openLogs: noop, revealBook: noop, restartServer: noop, reportProblem: noop }),
  ];
  const check = (items: MenuItemConstructorOptions[]) => items.forEach(item => {
    if (item.label && item.label !== 'Lucius') assert.ok(Object.hasOwn(nativeCatalogs['zh-CN']!, item.label), `missing menu label: ${item.label}`);
    if (Array.isArray(item.submenu)) check(item.submenu);
  });
  check(menus);
});
