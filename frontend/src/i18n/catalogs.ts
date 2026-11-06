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
import firstRunProviderZh from '../components/firstrun/provider.zh-CN.json'
import commonUiZh from '../components/ui/common.zh-CN.json'
import modelPickerZh from '../components/ui/model-picker.zh-CN.json'
import permissionModeZh from '../components/ui/permission-mode.zh-CN.json'
import browseStartersZh from '../components/skills/browse-starters.zh-CN.json'
import skillsTreeZh from '../components/skills/skills-tree.zh-CN.json'
import createMenuZh from '../components/skills/create-menu.zh-CN.json'
import widgetPickerZh from '../components/tabs/overview/widget-picker.zh-CN.json'
import overviewBriefingZh from '../components/tabs/overview/briefing.zh-CN.json'
import overviewMoneyFlowZh from '../components/tabs/overview/widgets/money-flow.zh-CN.json'
import overviewTransactionsZh from '../components/tabs/overview/widgets/transactions.zh-CN.json'
import overviewBudgetZh from '../components/tabs/overview/widgets/budget.zh-CN.json'
import overviewNetWorthZh from '../components/tabs/overview/widgets/net-worth.zh-CN.json'
import overviewInvestingZh from '../components/tabs/overview/widgets/investing.zh-CN.json'
import overviewCoreZh from '../components/tabs/overview/widgets/core.zh-CN.json'
import overviewPlanningZh from '../components/tabs/overview/widgets/planning.zh-CN.json'
import overviewReportsZh from '../components/tabs/overview/widgets/reports.zh-CN.json'
import overviewContentZh from '../components/tabs/overview/widgets/content.zh-CN.json'
import accountPickersZh from '../components/tabs/accounts/pickers.zh-CN.json'
import accountModalZh from '../components/tabs/accounts/modal.zh-CN.json'
import accountHeaderZh from '../components/tabs/accounts/header.zh-CN.json'
import accountBulkZh from '../components/tabs/accounts/bulk.zh-CN.json'
import accountSidebarZh from '../components/tabs/accounts/sidebar.zh-CN.json'
import accountRegisterZh from '../components/tabs/accounts/register.zh-CN.json'
import accountFilterZh from '../components/tabs/accounts/filter.zh-CN.json'
import accountRowsZh from '../components/tabs/accounts/rows.zh-CN.json'
import accountSplitViewZh from '../components/tabs/accounts/split-view.zh-CN.json'
import accountSplitEditorZh from '../components/tabs/accounts/split-editor.zh-CN.json'

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
    ...firstRunProviderZh,
    ...commonUiZh,
    ...modelPickerZh,
    ...permissionModeZh,
    ...browseStartersZh,
    ...skillsTreeZh,
    ...createMenuZh,
    ...widgetPickerZh,
    ...overviewBriefingZh,
    ...overviewMoneyFlowZh,
    ...overviewTransactionsZh,
    ...overviewBudgetZh,
    ...overviewNetWorthZh,
    ...overviewInvestingZh,
    ...overviewCoreZh,
    ...overviewPlanningZh,
    ...overviewReportsZh,
    ...overviewContentZh,
    ...accountPickersZh,
    ...accountModalZh,
    ...accountHeaderZh,
    ...accountBulkZh,
    ...accountSidebarZh,
    ...accountRegisterZh,
    ...accountFilterZh,
    ...accountRowsZh,
    ...accountSplitViewZh,
    ...accountSplitEditorZh,
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
