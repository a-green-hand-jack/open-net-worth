import type { ToolPermission } from '../api/toolPermissionsV2'
import type { IntlShape } from 'react-intl'
import { localizedToolTitle } from '../components/chat/toolActivity/localizedDisplay'
import registry from './toolDescriptions.registry.json'
import chinese from './toolDescriptions.zh-CN.json'
export const toolDescriptionCatalogs: Record<string, Record<string, string> | undefined> = {
  'zh-CN': chinese,
}

/** Translate only descriptions explicitly identified by the first-party registry snapshot. */
function trustedTool(row: ToolPermission): string | null {
  if (!row.description_source || row.connector_id.startsWith('mcp:')) return null
  const { tool, sha256 } = row.description_source
  const entry = (registry as Record<string, { english: string; sha256: string }>)[tool]
  return tool === row.tool && entry?.sha256 === sha256 && entry.english === row.description
    ? tool
    : null
}

export function toolPermissionDescription(row: ToolPermission, locale: string): string {
  const tool = trustedTool(row)
  if (!tool) return row.description
  const translation = toolDescriptionCatalogs[locale]?.[tool]
  return translation || row.description
}

export function toolPermissionTitle(
  row: ToolPermission,
  intl: IntlShape,
  fallback: string,
): string {
  const tool = trustedTool(row)
  return tool ? localizedToolTitle(tool, intl) || fallback : fallback
}
