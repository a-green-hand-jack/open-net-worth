import type { ChecklistItem } from './move-secrets';
import { message as t } from './native-messages';
import { desktopDateLocale, getDesktopLocale } from './desktop-locale';

export const checklistCopy: Record<string, { title: string; fix: string }> = {
  local_model: { title: 'A model on your computer', fix: 'Your Private Cloud server cannot reach a model on your computer. Add an API key under Settings → AI to use a hosted model.' },
  cli_subscription: { title: 'Claude Code or Codex subscription', fix: 'Open Terminal (Settings → Terminal) and sign in there: run claude, or codex login.' },
  operator_trust: { title: 'Trusted chat senders', fix: "Re-enable trusted senders yourself in the connector's settings." },
  local_mcp: { title: 'An MCP server that runs on your computer', fix: 'Add its hosted address under Connectors, or install it on this server.' },
  secrets_not_sent: { title: 'AI keys and connections', fix: 'They were not sent. Add your AI key under Settings → AI and reconnect your connectors.' },
};

function lines(items: ChecklistItem[]): string {
  return items.map(item => {
    const known = getDesktopLocale() !== 'en' && Object.hasOwn(checklistCopy, item.id) ? checklistCopy[item.id] : undefined;
    return `  • ${known ? t(known.title) : item.title}${item.detail ? ` (${item.detail})` : ''}: ${known ? t(known.fix) : item.fix}`;
  }).join('\n');
}

// What the person reads when a move ends: only what genuinely could not move, each with its fix.
export function movedDetail(items: ChecklistItem[], direction: 'to-cloud' | 'to-computer'): string {
  const rest = items.length ? `${t('A few things could not move:')}\n${lines(items)}` : t('Your keys, connections and automations moved with it.');
  const old = direction === 'to-cloud'
    ? t('The book on this computer is untouched, but it is now the old copy: its bots and automations are paused, and it shows a note when you open it. Use File → Move my book back to this computer any time.')
    : t('The copy in your Private Cloud is untouched, but it is now the old copy: its bots and automations are paused.');
  return `${rest}\n\n${old}`;
}

export function whenText(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t('earlier');
  const preference = desktopDateLocale();
  const text = date.toLocaleDateString(locale ?? preference, { year: 'numeric', month: 'short', day: 'numeric' });
  return !locale && preference ? text.replace(/\bSept\b/, 'Sep') : text;
}

export function movedBanner(iso: string): { text: string; openLabel: string } {
  const locale = getDesktopLocale();
  return {
    text: t('This book moved to your Private Cloud on {date}. Changes made here will not appear there.', locale, { date: whenText(iso) }),
    openLabel: t('Open Private Cloud'),
  };
}
