import { starterField } from './starterMessages'
import { useAppIntl } from '../../i18n/useAppIntl'
import { Badge, Button, Loading, Text, TextField } from '../ui'
import type { SelectedFile, Skill, SkillBundle } from '../../types/skills'
import { FileTree } from './FileTree'
import { EntityRow } from '../../lucius/EntityRow'
import { ChevronRight } from '../../ui/icons'

interface SkillsTreeProps {
  skills: Skill[]
  selectedSkillId: string | null
  selectedFile: SelectedFile | null
  onSelectSkill: (skillId: string) => void
  onSelectFile: (file: SelectedFile) => void
  onCreateFirstSkill: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  bundles: Record<string, SkillBundle>
  bundleLoading: Record<string, boolean>
  onExpandSkill: (skillId: string) => void
  expandedSkills: Set<string>
}

/**
 * Left panel: search bar + flat skill list, each row with a file sub-tree.
 *
 * Rows are role="treeitem" for a11y. EVERY skill has a tree (at minimum SKILL.md);
 * the chevron toggles the FileTree. Bundles are prefetched in bulk by the parent, so expanding
 * is instant (no per-skill spinner).
 */
export function SkillsTree({
  skills,
  selectedSkillId,
  selectedFile,
  onSelectSkill,
  onSelectFile,
  onCreateFirstSkill,
  searchQuery,
  onSearchChange,
  bundles,
  bundleLoading,
  onExpandSkill,
  expandedSkills,
}: SkillsTreeProps) {
  const { formatMessage, locale } = useAppIntl()
  const query = searchQuery.trim().toLowerCase()
  const filtered = query
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          starterField(locale, 'name', s.name, s.id, s.starter_source)
            .toLowerCase()
            .includes(query) ||
          (s.description || '').toLowerCase().includes(query) ||
          starterField(locale, 'description', s.description || '', s.id, s.starter_source)
            .toLowerCase()
            .includes(query),
      )
    : skills

  // Sort: built-ins first, then alphabetical by name.
  const sorted = filtered.slice().sort((a, b) => {
    const ba = a.author === 'builtin' ? 0 : 1
    const bb = b.author === 'builtin' ? 0 : 1
    return ba - bb || a.name.localeCompare(b.name)
  })

  return (
    <nav
      className="skills-tree"
      aria-label={formatMessage({ id: 'skills.tree.label', defaultMessage: 'Skills tree' })}
    >
      <div className="tree-search-bar">
        <TextField
          value={searchQuery}
          placeholder={formatMessage({
            id: 'skills.tree.placeholder',
            defaultMessage: 'Search skills…',
          })}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={formatMessage({ id: 'skills.tree.search', defaultMessage: 'Search skills' })}
        />
      </div>

      <div className="tree-body" role="tree">
        {skills.length === 0 ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <Text tone="faint" size="xs">
              {formatMessage({
                id: 'skills.tree.empty',
                defaultMessage:
                  'No skills yet. Create your first skill to start a reusable Lucius routine.',
              })}
            </Text>
            <Button variant="secondary" size="sm" onClick={onCreateFirstSkill}>
              {formatMessage({
                id: 'skills.tree.createFirst',
                defaultMessage: 'Create your first skill',
              })}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <Text tone="faint" size="xs">
              {formatMessage(
                { id: 'skills.tree.noMatch', defaultMessage: 'No skills match \"{query}\".' },
                { query: searchQuery },
              )}
            </Text>
          </div>
        ) : (
          <>
            {sorted.map((skill) => (
              <SkillTreeRow
                key={skill.id}
                skill={skill}
                isSelected={selectedSkillId === skill.id}
                isExpanded={expandedSkills.has(skill.id)}
                selectedFile={selectedFile}
                bundle={bundles[skill.id] ?? null}
                bundleLoading={!!bundleLoading[skill.id]}
                onSelect={() => onSelectSkill(skill.id)}
                onToggleExpand={() => onExpandSkill(skill.id)}
                onSelectFile={onSelectFile}
              />
            ))}
          </>
        )}
      </div>
    </nav>
  )
}

function SkillTreeRow({
  skill,
  isSelected,
  isExpanded,
  selectedFile,
  bundle,
  bundleLoading,
  onSelect,
  onToggleExpand,
  onSelectFile,
}: {
  skill: Skill
  isSelected: boolean
  isExpanded: boolean
  selectedFile: SelectedFile | null
  bundle: SkillBundle | null
  bundleLoading: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onSelectFile: (f: SelectedFile) => void
}) {
  // EVERY skill shows a file tree — consistency over the old single-file vs bundled split.
  // The minimum tree is just SKILL.md; script skills add scripts/ (manifest is derived server-side).
  // Optional agents/openai.yaml metadata is shown when the portable bundle contains it.
  const { formatMessage, locale } = useAppIntl()
  const displayName = starterField(locale, 'name', skill.name, skill.id, skill.starter_source)
  const displayDescription = starterField(
    locale,
    'description',
    skill.description || '',
    skill.id,
    skill.starter_source,
  )
  const hasTree = true

  function handleClick() {
    onSelect()
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.stopPropagation()
    onToggleExpand()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    } else if (e.key === 'ArrowRight' && hasTree && !isExpanded) {
      e.preventDefault()
      onToggleExpand()
    } else if (e.key === 'ArrowLeft' && hasTree && isExpanded) {
      e.preventDefault()
      onToggleExpand()
    }
  }

  // EntityRow is a TRANSPARENT wrapper: it renders the host <button> itself and stamps
  // data-entity-id + draggable + data-ctx-*, which is what makes a skill @-mentionable,
  // right-clickable ("Ask Lucius about this") and draggable into the dock. The "/" verb
  // surface already worked; this adds the "@" entity surface the descriptor also declares.
  return (
    <>
      <EntityRow
        as="button"
        htmlType="button"
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasTree ? isExpanded : undefined}
        className={`skill-tree-row${isSelected ? ' skill-tree-row--selected' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={displayDescription || displayName}
        type="skill"
        id={skill.id}
        label={displayName || formatMessage({ id: 'skills.unnamed', defaultMessage: '(unnamed)' })}
        item={skill}
        toFields={(it) => ({
          name: it.name,
          description: it.description,
          enabled: it.enabled ? 'on' : 'off',
        })}
        search={`${skill.name} ${skill.description ?? ''}`}
        sublabel={
          skill.enabled
            ? formatMessage({ id: 'skills.tree.skillOn', defaultMessage: 'Skill • on' })
            : formatMessage({ id: 'skills.tree.skillOff', defaultMessage: 'Skill • off' })
        }
      >
        {/* Chevron — only for script skills */}
        {hasTree ? (
          <span
            className={`skill-tree-row__chevron${isExpanded ? ' skill-tree-row__chevron--open' : ''}`}
            onClick={handleChevronClick}
            role="button"
            tabIndex={-1}
            aria-label={
              isExpanded
                ? formatMessage({ id: 'skills.tree.collapse', defaultMessage: 'Collapse' })
                : formatMessage({ id: 'skills.tree.expand', defaultMessage: 'Expand' })
            }
          >
            <ChevronRight size="1em" />
          </span>
        ) : (
          <span
            className="skill-tree-row__chevron skill-tree-row__chevron--placeholder"
            aria-hidden
          >
            <ChevronRight size="1em" />
          </span>
        )}

        <span className="skill-tree-row__name">
          {displayName || formatMessage({ id: 'skills.unnamed', defaultMessage: '(unnamed)' })}
        </span>

        {/* Status badges */}
        <span className="skill-tree-row__badge">
          {!skill.enabled && (
            <Badge tone="muted">{formatMessage({ id: 'skills.off', defaultMessage: 'Off' })}</Badge>
          )}
        </span>
      </EntityRow>

      {/* File tree — rendered when expanded and bundle is loaded */}
      {hasTree && isExpanded && (
        <div role="group">
          {bundleLoading ? (
            <div style={{ paddingLeft: 'var(--space-8)', paddingTop: 'var(--space-2)' }}>
              <Loading
                label={formatMessage({
                  id: 'skills.tree.loading',
                  defaultMessage: 'Loading bundle…',
                })}
              />
            </div>
          ) : bundle ? (
            <FileTree
              bundle={bundle}
              skillId={skill.id}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ) : (
            <div
              style={{ paddingLeft: 'var(--space-8)', padding: 'var(--space-2) var(--space-8)' }}
            >
              <Text tone="faint" size="xs">
                {formatMessage({
                  id: 'skills.tree.bundleError',
                  defaultMessage: 'Could not load bundle.',
                })}
              </Text>
            </div>
          )}
        </div>
      )}
    </>
  )
}
