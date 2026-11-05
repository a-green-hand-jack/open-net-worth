import { useEffect, useRef, useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { Check, Copy } from 'lucide-react'
import { Button, CollapsibleSection, Stack, Text } from '../ui'

export type CliHostPlatform = 'macos' | 'windows' | 'linux' | 'other'
export interface CliSubscriptionHelpProps {
  provider: 'claude_cli' | 'codex_cli'
  platform?: CliHostPlatform
  detected: boolean
  onCheck: () => Promise<unknown>
  /** Private Cloud: the sign-in happens in the in-app Terminal on the server, not on this computer. */
  terminal?: { onOpen: () => void }
}

const PROVIDERS = {
  claude_cli: {
    label: 'Claude Code',
    unix: 'curl -fsSL https://claude.ai/install.sh | bash',
    windows: 'irm https://claude.ai/install.ps1 | iex',
    login: 'claude auth login',
    instructions: 'https://code.claude.com/docs/en/setup',
    signIn: 'Choose your Claude subscription when prompted.',
  },
  codex_cli: {
    label: 'Codex',
    unix: 'curl -fsSL https://chatgpt.com/codex/install.sh | sh',
    windows:
      'powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"',
    login: 'codex login',
    instructions: 'https://developers.openai.com/codex/cli',
    signIn: 'Choose “Sign in with ChatGPT” when prompted.',
  },
} as const

function CopyCommand({ command, label }: { command: string; label: string }) {
  const { formatMessage } = useAppIntl()
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  async function copy() {
    if (timer.current) clearTimeout(timer.current)
    setCopied(false)
    setFailed(false)
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setFailed(true)
    }
  }

  return (
    <Stack gap="--space-2">
      <div className="cli-subscription-command-row">
        <code className="cli-subscription-command">{command}</code>
        <button
          type="button"
          className="cli-subscription-copy"
          aria-label={label}
          title={
            copied
              ? formatMessage({ id: 'shared.cli.copied', defaultMessage: 'Copied' })
              : formatMessage({ id: 'shared.cli.copy', defaultMessage: 'Copy' })
          }
          data-copied={copied || undefined}
          onClick={() => void copy()}
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          <span className="sr-only">
            {copied
              ? formatMessage({ id: 'shared.cli.copied', defaultMessage: 'Copied' })
              : formatMessage({ id: 'shared.cli.copy', defaultMessage: 'Copy' })}
          </span>
        </button>
      </div>
      <span role="status" className="sr-only">
        {copied
          ? formatMessage({ id: 'shared.cli.commandCopied', defaultMessage: 'Command copied.' })
          : ''}
      </span>
      {failed && (
        <div role="status">
          <Text as="p" size="sm" tone="muted">
            {formatMessage({
              id: 'shared.cli.copyError',
              defaultMessage: 'Could not copy. Select the command and copy it manually.',
            })}
          </Text>
        </div>
      )}
    </Stack>
  )
}

function InstallationSteps({
  provider,
  platform,
}: Pick<CliSubscriptionHelpProps, 'provider' | 'platform'>) {
  const { formatMessage } = useAppIntl()
  const details = PROVIDERS[provider]
  const knownPlatform = platform === 'windows' || platform === 'macos' || platform === 'linux'
  const command = platform === 'windows' ? details.windows : details.unix
  return (
    <Stack gap="--space-5">
      {knownPlatform && (
        <>
          <Stack gap="--space-2">
            <Text as="p" size="sm" weight={600}>
              {formatMessage(
                {
                  id: 'shared.cli.installStep',
                  defaultMessage: '1. Install {provider} in {terminal}',
                },
                {
                  provider: details.label,
                  terminal: platform === 'windows' ? 'PowerShell' : 'Terminal',
                },
              )}
            </Text>
            <CopyCommand
              key={command}
              command={command}
              label={formatMessage(
                { id: 'shared.cli.copyInstall', defaultMessage: 'Copy {provider} install command' },
                { provider: details.label },
              )}
            />
          </Stack>
          <Stack gap="--space-2">
            <Text as="p" size="sm" weight={600}>
              {formatMessage({
                id: 'shared.cli.signInStep',
                defaultMessage: '2. Open a new terminal and sign in',
              })}
            </Text>
            <CopyCommand
              key={details.login}
              command={details.login}
              label={formatMessage(
                { id: 'shared.cli.copySignIn', defaultMessage: 'Copy {provider} sign-in command' },
                { provider: details.label },
              )}
            />
            <Text as="p" size="sm" tone="muted">
              {provider === 'claude_cli'
                ? formatMessage({
                    id: 'shared.cli.claudeSignIn',
                    defaultMessage: 'Choose your Claude subscription when prompted.',
                  })
                : formatMessage({
                    id: 'shared.cli.codexSignIn',
                    defaultMessage: 'Choose “Sign in with ChatGPT” when prompted.',
                  })}{' '}
              {formatMessage({ id: 'shared.cli.limits', defaultMessage: 'Plan limits apply.' })}
            </Text>
          </Stack>
        </>
      )}
      {!knownPlatform && (
        <a
          className="cli-subscription-link"
          href={details.instructions}
          target="_blank"
          rel="noreferrer"
        >
          {formatMessage(
            {
              id: 'shared.cli.official',
              defaultMessage: 'Official {provider} installation instructions',
            },
            { provider: details.label },
          )}
        </a>
      )}
    </Stack>
  )
}

function TerminalSteps({
  provider,
  onOpen,
}: Pick<CliSubscriptionHelpProps, 'provider'> & { onOpen: () => void }) {
  const { formatMessage } = useAppIntl()
  // The terminal runs on the server: Codex's default sign-in sends the browser to the server's
  // own 127.0.0.1, which this browser cannot reach. Its device-code sign-in works from anywhere.
  const command = provider === 'claude_cli' ? 'claude' : 'codex login --device-auth'
  const signIn =
    provider === 'claude_cli'
      ? formatMessage({
          id: 'shared.cli.claudeSignIn',
          defaultMessage: 'Choose your Claude subscription when prompted.',
        })
      : formatMessage({
          id: 'shared.cli.deviceAuth',
          defaultMessage: 'It shows a link and a code: open the link here and enter the code.',
        })
  return (
    <Stack gap="--space-3">
      <Text as="p" size="sm">
        {formatMessage(
          {
            id: 'shared.cli.terminalInstructions',
            defaultMessage:
              'Open Terminal and run <code>{command}</code>. {signIn} This updates on its own once you are signed in.',
          },
          {
            command,
            signIn,
            code: (chunks) => <code className="cli-subscription-command">{chunks}</code>,
          },
        )}
      </Text>
      <Text as="p" size="sm" tone="muted">
        {formatMessage({
          id: 'shared.cli.terminalNotice',
          defaultMessage:
            'This is your server. Tools you sign in to here are used under your own agreement with their provider.',
        })}
      </Text>
      <div>
        <Button variant="secondary" onClick={onOpen}>
          {formatMessage({ id: 'shared.cli.openTerminal', defaultMessage: 'Open Terminal' })}
        </Button>
      </div>
    </Stack>
  )
}

// While the help is open, re-check on its own: when the window regains focus (back from the
// terminal) and every few seconds. There is no button to press.
const RECHECK_MS = 4000

export function CliSubscriptionHelp({
  provider,
  platform,
  detected,
  onCheck,
  terminal,
}: CliSubscriptionHelpProps) {
  const { formatMessage } = useAppIntl()
  const [open, setOpen] = useState(false)
  const check = useRef(onCheck)
  useEffect(() => {
    check.current = onCheck
  }, [onCheck])

  useEffect(() => {
    if (!open) return
    let busy = false
    const recheck = () => {
      if (busy) return
      busy = true
      void check
        .current()
        .catch(() => {})
        .finally(() => {
          busy = false
        })
    }
    window.addEventListener('focus', recheck)
    const timer = setInterval(recheck, RECHECK_MS)
    return () => {
      window.removeEventListener('focus', recheck)
      clearInterval(timer)
    }
  }, [open])

  // Install-and-sign-in help is for a tool that isn't there yet. A tool already found needs no
  // row; one found while the help is open (installed just now) keeps it open, since found is not
  // signed in.
  if (detected && !open) return null

  return (
    <CollapsibleSection
      className="cli-subscription-help"
      title={
        terminal
          ? formatMessage({
              id: 'shared.cli.signInTerminal',
              defaultMessage: 'Sign in from Terminal',
            })
          : formatMessage({ id: 'shared.cli.installSignIn', defaultMessage: 'Install & sign in' })
      }
      open={open}
      onOpenChange={setOpen}
      actions={
        <span role="status">
          <Text size="sm" tone="muted">
            {detected
              ? formatMessage({ id: 'shared.cli.detected', defaultMessage: 'Detected' })
              : formatMessage({ id: 'shared.cli.notInstalled', defaultMessage: 'Not installed' })}
          </Text>
        </span>
      }
    >
      {terminal ? (
        <TerminalSteps provider={provider} onOpen={terminal.onOpen} />
      ) : (
        <Stack gap="--space-5">
          <Text as="p" size="sm" tone="muted">
            {formatMessage({
              id: 'shared.cli.runHere',
              defaultMessage:
                'Run these on the computer running Open Net Worth. This updates on its own once it’s installed.',
            })}
          </Text>
          <InstallationSteps provider={provider} platform={platform} />
        </Stack>
      )}
    </CollapsibleSection>
  )
}
