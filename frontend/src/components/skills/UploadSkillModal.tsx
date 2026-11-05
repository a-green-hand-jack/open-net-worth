import { skillError } from './skillErrors'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useRef, useState } from 'react'
import { Badge, Button, Cluster, Modal, Stack, Text } from '../ui'
import { authFetch } from '../../api/client'
import type { Skill } from '../../types/skills'

interface UploadSkillModalProps {
  onClose: () => void
  onInstalled: (skill: Skill) => void
}

/**
 * Upload a .zip ONW skill bundle.
 * State A: drop zone (drag-over → accent border) with hidden file input.
 * State B: installed-but-DISABLED banner + skill summary.
 * Errors shown inline (400/422/409 detail from the API).
 *
 * The installed skill is always DISABLED — the user must enable it via the detail pane toggle.
 */
export function UploadSkillModal({ onClose, onInstalled }: UploadSkillModalProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [installed, setInstalled] = useState<Skill | null>(null)

  async function uploadFile(file: File) {
    if (!file.name.endsWith('.zip')) {
      setUploadError(
        formatMessage({
          id: 'skills.upload.zipOnly',
          defaultMessage: 'Only .zip files are accepted.',
        }),
      )
      return
    }
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await authFetch('/api/skills/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        const detail =
          typeof d?.detail === 'string'
            ? d.detail
            : Array.isArray(d?.detail)
              ? d.detail.map((x: { msg?: string }) => x.msg).join('; ')
              : formatMessage(
                  {
                    id: 'skills.upload.httpError',
                    defaultMessage: 'Upload failed (HTTP {status})',
                  },
                  { status: res.status },
                )
        setUploadError(skillError(intl, d, detail))
        return
      }
      const d = await res.json()
      const skill: Skill = d.skill
      setInstalled(skill)
    } catch {
      setUploadError(
        formatMessage({ id: 'skills.serverError', defaultMessage: 'Could not reach the server.' }),
      )
    } finally {
      setUploading(false)
    }
  }

  async function downloadTemplate() {
    try {
      const res = await authFetch('/api/skills/template')
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'skill-template.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* best-effort download */
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
    // Reset input so re-selecting the same file fires onChange again.
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadFile(file)
  }

  return (
    <Modal
      open
      size="md"
      title={formatMessage({ id: 'skills.menu.upload', defaultMessage: 'Upload a skill' })}
      onClose={onClose}
      footer={
        <Cluster justify="end" gap="--space-2">
          <Button variant="ghost" onClick={installed ? () => onInstalled(installed) : onClose}>
            {installed
              ? formatMessage({ id: 'skills.done', defaultMessage: 'Done' })
              : formatMessage({ id: 'skills.cancel', defaultMessage: 'Cancel' })}
          </Button>
        </Cluster>
      }
    >
      <Stack gap="--space-5">
        {!installed ? (
          <>
            <Text tone="muted" size="sm">
              {formatMessage(
                {
                  id: 'skills.upload.help',
                  defaultMessage:
                    'Upload a <code>.zip</code> with a standard <code>SKILL.md</code> (frontmatter <code>name</code> + <code>description</code> + instructions). Skills use ordinary tool discovery and never alter tool policy. Add <code>references/*.md</code> for docs, or <code>scripts/*.py</code> for a script skill. Installs <strong>disabled</strong> — review, then enable it. <link>Download a template</link>.',
                },
                {
                  code: (chunks) => <code>{chunks}</code>,
                  strong: (chunks) => <strong>{chunks}</strong>,
                  link: (chunks) => (
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        void downloadTemplate()
                      }}
                    >
                      {chunks}
                    </a>
                  ),
                },
              )}
            </Text>

            {/* Drop zone */}
            <div
              className={`upload-dropzone${dragOver ? ' upload-dropzone--drag-over' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={formatMessage({
                id: 'skills.upload.dropLabel',
                defaultMessage: 'Drop a .zip file here or click to browse',
              })}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="upload-dropzone__input"
                onChange={onFileChange}
                aria-hidden="true"
              />
              {uploading ? (
                <Text tone="faint" size="sm">
                  {formatMessage({ id: 'skills.upload.installing', defaultMessage: 'Installing…' })}
                </Text>
              ) : (
                <>
                  <Text size="md" weight={600}>
                    {formatMessage({
                      id: 'skills.upload.drop',
                      defaultMessage: 'Drop a .zip file here',
                    })}
                  </Text>
                  <Text tone="faint" size="sm">
                    {formatMessage({
                      id: 'skills.upload.browseFiles',
                      defaultMessage: 'or click to browse',
                    })}
                  </Text>
                </>
              )}
            </div>

            {uploadError && (
              <div role="alert">
                <Text tone="bad" size="sm">
                  {uploadError}
                </Text>
              </div>
            )}
          </>
        ) : (
          /* State B: installed banner */
          <Stack gap="--space-4">
            <div className="upload-installed-banner">
              <Text size="sm" weight={600}>
                {formatMessage(
                  {
                    id: 'skills.upload.disabledHelp',
                    defaultMessage:
                      'This skill is installed but <warning>DISABLED</warning>. Enable it with the toggle in its detail pane.',
                  },
                  { warning: (chunks) => <span style={{ color: 'var(--warn)' }}>{chunks}</span> },
                )}
              </Text>
            </div>

            <Stack gap="--space-2">
              <Text size="sm" weight={600}>
                {installed.name ||
                  formatMessage({ id: 'skills.unnamed', defaultMessage: '(unnamed)' })}
              </Text>
              {installed.description && (
                <Text tone="muted" size="sm">
                  {installed.description}
                </Text>
              )}
              <Cluster gap="--space-2" wrap>
                {installed.has_scripts && (
                  <Badge tone="neutral">
                    {formatMessage({ id: 'skills.upload.code', defaultMessage: 'Includes code' })}
                  </Badge>
                )}
                <Badge tone="muted">
                  {formatMessage({ id: 'skills.disabled', defaultMessage: 'Disabled' })}
                </Badge>
                {installed.author && (
                  <Badge tone="muted">
                    {installed.author === 'builtin'
                      ? 'Open Net Worth'
                      : installed.author === 'lucius'
                        ? 'Lucius'
                        : formatMessage({ id: 'skills.you', defaultMessage: 'You' })}
                  </Badge>
                )}
              </Cluster>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
