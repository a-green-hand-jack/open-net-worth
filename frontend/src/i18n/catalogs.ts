import type { Locale } from './locale'
import appearanceZh from '../components/tabs/settings/sections/appearance.zh-CN.json'
import dedupZh from '../components/tabs/settings/sections/dedup.zh-CN.json'
import profileZh from '../components/tabs/settings/sections/profile.zh-CN.json'
import chatZh from '../components/tabs/settings/sections/chat.zh-CN.json'
import memoryZh from '../components/tabs/settings/memory.zh-CN.json'
import helpZh from '../components/tabs/settings/sections/help.zh-CN.json'
import currencyZh from '../components/tabs/settings/sections/currency.zh-CN.json'
import terminalZh from '../components/tabs/settings/sections/terminal.zh-CN.json'
import intelSettingsZh from '../components/tabs/settings/sections/intel/intel.zh-CN.json'
import securityZh from '../components/tabs/settings/sections/security.zh-CN.json'
import loginZh from '../components/login.zh-CN.json'
import usageZh from '../components/tabs/settings/sections/usage.zh-CN.json'
import mcpZh from '../components/tabs/settings/sections/mcp.zh-CN.json'
import desktopSettingsZh from '../components/tabs/settings/sections/desktop.zh-CN.json'
import shortcutsZh from '../components/tabs/settings/sections/shortcuts.zh-CN.json'
import dataSettingsZh from '../components/tabs/settings/sections/data.zh-CN.json'
import permissionsLegacyZh from '../components/tabs/settings/sections/permissions-legacy.zh-CN.json'
import toolTitlesZh from '../components/chat/toolActivity/toolTitles.zh-CN.json'
import permissionsV2Zh from '../components/tabs/settings/sections/permissions-v2.zh-CN.json'
import developerZh from '../components/tabs/settings/developer.zh-CN.json'
import modelSupportZh from '../components/tabs/settings/sections/model-support.zh-CN.json'
import modelSettingsZh from '../components/tabs/settings/sections/model-settings.zh-CN.json'
import firstRunCoreZh from '../components/firstrun/first-run-core.zh-CN.json'
import firstRunRestoreZh from '../components/firstrun/restore.zh-CN.json'

export const catalogs: Record<Locale, Record<string, string> | undefined> = {
  en: undefined,
  'zh-CN': {
    ...appearanceZh,
    ...dedupZh,
    ...profileZh,
    ...chatZh,
    ...memoryZh,
    ...helpZh,
    ...currencyZh,
    ...terminalZh,
    ...intelSettingsZh,
    ...securityZh,
    ...loginZh,
    ...usageZh,
    ...mcpZh,
    ...desktopSettingsZh,
    ...shortcutsZh,
    ...dataSettingsZh,
    ...permissionsLegacyZh,
    ...toolTitlesZh,
    ...permissionsV2Zh,
    ...developerZh,
    ...modelSupportZh,
    ...modelSettingsZh,
    ...firstRunCoreZh,
    ...firstRunRestoreZh,
    'auth.signingBackIn': '正在重新登录…',
    'auth.rateLimit': '尝试次数过多。请在 {minutes, plural, other {# 分钟}}后重试。',
    'settings.section.language': '界面语言',
    'settings.section.profile': '个人资料',
    'settings.section.model': 'AI',
    'settings.section.chat': '聊天',
    'settings.section.memory': '记忆',
    'settings.section.permissions': '权限',
    'settings.section.dedup': '重复检测',
    'settings.section.intel': '资讯',
    'settings.section.appearance': '外观',
    'settings.section.desktop': '桌面应用',
    'settings.section.shortcuts': '手机快捷方式',
    'settings.section.mcp': 'MCP',
    'settings.section.currency': '货币和格式',
    'settings.section.security': '安全',
    'settings.section.data': '数据',
    'settings.section.terminal': '终端',
    'settings.section.help': '帮助',
    'settings.section.developer': '开发者',
    'settings.section.aiUsage': '成本和性能',
    'settings.group.account': '账户',
    'settings.group.assistant': '助手',
    'settings.group.app': '应用',
    'settings.group.phone': '手机和其他应用',
    'settings.group.advanced': '高级',
    'settings.group.support': '支持',
    'settings.title': '设置',
    'settings.close': '关闭设置',
    'settings.backTo': '返回{label}',
    'settings.backAll': '返回所有设置',
    'settings.sections': '设置类别',
    'settings.search': '搜索',
    'settings.searchSettings': '搜索设置',
    'settings.clearSearch': '清除搜索',
    'settings.noMatches': '没有匹配的设置',
    'settings.yourProfile': '你的个人资料',
    'language.description': '选择此资料在所有设备上使用的界面语言',
    'language.browser': '跟随浏览器',
    'language.saved': '语言已更新',
    'language.failed': '无法保存语言设置，请重试。',
    'language.loadFailed': '无法加载语言设置，当前使用浏览器语言。',
    'language.retry': '重试',
    'nav.lucius': 'Lucius',
    'nav.dashboard': '概览',
    'nav.inbox': '收件箱',
    'nav.investments': '投资',
    'nav.accounts': '账户',
    'nav.assets': '资产',
    'nav.commitments': '待付款项',
    'nav.plan': '规划',
    'nav.intel': '资讯',
    'nav.skills': '技能',
    'nav.automations': '自动化',
    'nav.build': '构建',
    'nav.profile': '个人资料',
    'nav.connectors': '连接器',
    'nav.settings': '设置',
    'nav.help': '帮助',
  },
}
