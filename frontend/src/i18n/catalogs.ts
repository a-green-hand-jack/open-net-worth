import type { Locale } from './locale'

export const catalogs: Record<Locale, Record<string, string> | undefined> = {
  en: undefined,
  'zh-CN': {
    'auth.signingBackIn': '正在重新登录…',
    'settings.section.language': '界面语言',
    'language.description': '选择此资料在所有设备上使用的界面语言',
    'language.browser': '跟随浏览器',
    'language.saved': '语言已更新',
    'language.failed': '无法保存语言设置，请重试。',
    'language.loadFailed': '无法加载语言设置，当前使用浏览器语言。',
    'language.retry': '重试',
  },
}
