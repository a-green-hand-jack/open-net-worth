import type { MenuItemConstructorOptions } from 'electron';

import type { DesktopLocale } from './desktop-locale';
import { message } from './native-messages';

export function localizeMenu(items: MenuItemConstructorOptions[], locale: DesktopLocale): MenuItemConstructorOptions[] {
  return items.map(item => ({
    ...item,
    ...(item.label ? { label: message(item.label, locale) } : {}),
    ...(Array.isArray(item.submenu) ? { submenu: localizeMenu(item.submenu, locale) } : {}),
  }));
}

interface NativeMenuItem { label: string; role?: string; submenu?: NativeMenu | null }
interface NativeMenu { items: NativeMenuItem[] }

export const roleNames: Record<string, string> = {
  editmenu: 'Edit', windowmenu: 'Window', help: 'Help', undo: 'Undo', redo: 'Redo', cut: 'Cut',
  copy: 'Copy', paste: 'Paste', pasteandmatchstyle: 'Paste and Match Style', delete: 'Delete',
  selectall: 'Select All', showsubstitutions: 'Show Substitutions', togglesmartquotes: 'Smart Quotes',
  togglesmartdashes: 'Smart Dashes', toggletextreplacement: 'Text Replacement', startspeaking: 'Start Speaking',
  stopspeaking: 'Stop Speaking', services: 'Services', hideothers: 'Hide Others', unhide: 'Show All',
  minimize: 'Minimize', zoom: 'Zoom', front: 'Bring All to Front', close: 'Close',
  resetzoom: 'Actual Size', zoomin: 'Zoom In', zoomout: 'Zoom Out', togglefullscreen: 'Toggle Full Screen',
};

// Electron expands editMenu according to the OS; translate the expanded role items so its
// own defaults, native behavior and accelerators remain authoritative.
export function localizeNativeRoles(menu: NativeMenu, locale: DesktopLocale, appName: string): void {
  if (locale === 'en') return;
  for (const item of menu.items) {
    const role = item.role?.toLowerCase();
    if (role === 'about') item.label = message('About {app}', locale, { app: appName });
    else if (role === 'hide') item.label = message('Hide {app}', locale, { app: appName });
    else if (role === 'quit') item.label = message('Quit {app}', locale, { app: appName });
    else if (role && roleNames[role]) item.label = message(roleNames[role], locale);
    else if (item.label === 'Substitutions' || item.label === 'Speech') item.label = message(item.label, locale);
    if (item.submenu) localizeNativeRoles(item.submenu, locale, appName);
  }
}
