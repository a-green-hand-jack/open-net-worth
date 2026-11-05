export type DesktopLocale = 'en' | 'zh-CN';
export type DesktopDateFormat = 'dmy' | 'mdy' | 'iso' | null;
let currentLocale: DesktopLocale = 'en';
let dateFormat: DesktopDateFormat = null;

export function setDesktopLocale(locale: DesktopLocale): void { currentLocale = locale; }
export function getDesktopLocale(): DesktopLocale { return currentLocale; }
export function setDesktopDateFormat(format: DesktopDateFormat): void { dateFormat = format; }
export function desktopDateLocale(): string | undefined {
  return dateFormat === 'mdy' ? 'en-US' : dateFormat === 'dmy' || dateFormat === 'iso' ? 'en-GB' : undefined;
}

export function desktopLocale(locale: string): DesktopLocale {
  const tag = locale.toLowerCase().replaceAll('_', '-');
  return tag === 'zh' || tag === 'zh-cn' || tag === 'zh-hans' || tag.startsWith('zh-hans-') ? 'zh-CN' : 'en';
}

export function desktopBrowserLocale(languages: readonly string[]): DesktopLocale {
  for (const language of languages) {
    const tag = language.toLowerCase().replaceAll('_', '-');
    if (tag === 'zh' || tag === 'zh-cn' || tag === 'zh-hans' || tag.startsWith('zh-hans-')) return 'zh-CN';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return 'en';
}
