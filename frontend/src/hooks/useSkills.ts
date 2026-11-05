import { useCallback } from 'react'
import type { ClaudeSkillMetadata, OpenAISkillMetadata, Skill } from '../types/skills'
import { authFetch } from '../api/client'
import { invalidateQueryCache, useQueryCache } from '../state/queryCache'

export interface SkillCreateBody {
  name: string
  description: string
  body?: string
  claude?: ClaudeSkillMetadata
  openai?: OpenAISkillMetadata
}

export interface SkillMessageItem { text: string; message_id?: string; params?: Record<string, string> }
export interface SkillResult { ok: boolean; error?: string; messageId?: string; messageParams?: Record<string, string>; messageItems?: SkillMessageItem[] }

export interface SkillsState {
  skills: Skill[]
  loading: boolean
  error: string | null
  errorMessageId?: string
  errorMessageParams?: Record<string, string>
  refresh: () => void
  createSkill: (body: SkillCreateBody) => Promise<SkillResult>
  updateSkill: (
    id: string,
    changes: Record<string, unknown>,
  ) => Promise<SkillResult>
  deleteSkill: (id: string) => Promise<SkillResult>
}

export async function skillProblem(r: Response): Promise<SkillResult> {
  // FastAPI HTTPException → { detail: "..." }; fall back to status text.
  try {
    const j = await r.json()
    const error = typeof j?.detail === 'string' ? j.detail : Array.isArray(j?.detail) ? j.detail.map((d: { msg?: string }) => d.msg).join('; ') : `Request failed (${r.status})`
    const params = j?.message_params
    if (typeof j?.message_id === 'string' && params && typeof params === 'object' && !Array.isArray(params) && Object.values(params).every((v) => typeof v === 'string')) {
      const items = Array.isArray(j.message_items) && j.message_items.every((item: unknown) => item && typeof item === 'object' && typeof (item as SkillMessageItem).text === 'string') ? j.message_items as SkillMessageItem[] : undefined
      return { ok: false, error, messageId: j.message_id, messageParams: params as Record<string, string>, ...(items ? { messageItems: items } : {}) }
    }
    return { ok: false, error }
  } catch {
    /* not JSON */
  }
  return { ok: false, error: `Request failed (${r.status})` }
}

class SkillLoadError extends Error {
  messageId?: string
  messageParams?: Record<string, string>
  constructor(problem: SkillResult) {
    super(problem.error)
    this.messageId = problem.messageId
    this.messageParams = problem.messageParams
  }
}

/** Fetches /api/skills and exposes the direct (non-LLM) authoring path. */
export function useSkills(): SkillsState {
  const query = useQueryCache<unknown>('tab:skills', async () => {
    let response: Response
    try {
      response = await authFetch('/api/skills')
    } catch {
      throw new SkillLoadError({ ok: false, error: 'Could not reach the server.', messageId: 'skills.error.network', messageParams: {} })
    }
    if (!response.ok) throw new SkillLoadError(await skillProblem(response))
    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) throw new SkillLoadError({ ok: false, error: 'The server returned an invalid skills list.', messageId: 'skills.error.invalidList', messageParams: {} })
    return payload
  })
  const load = useCallback(async () => {
    await query.refresh()
  }, [query])

  const createSkill = useCallback(
    async (body: SkillCreateBody) => {
      try {
        const r = await authFetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) return skillProblem(r)
        invalidateQueryCache('tab:skills')
        await load()
        return { ok: true }
      } catch {
        return { ok: false, error: 'Could not reach the server.', messageId: 'skills.error.network', messageParams: {} }
      }
    },
    [load],
  )

  const updateSkill = useCallback(
    async (id: string, changes: Record<string, unknown>) => {
      try {
        const r = await authFetch(`/api/skills/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes }),
        })
        if (!r.ok) return skillProblem(r)
        invalidateQueryCache('tab:skills')
        await load()
        return { ok: true }
      } catch {
        return { ok: false, error: 'Could not reach the server.', messageId: 'skills.error.network', messageParams: {} }
      }
    },
    [load],
  )

  const deleteSkill = useCallback(
    async (id: string) => {
      try {
        const r = await authFetch(`/api/skills/${encodeURIComponent(id)}`, { method: 'DELETE' })
        if (!r.ok) return skillProblem(r)
        invalidateQueryCache('tab:skills')
        await load()
        return { ok: true }
      } catch {
        return { ok: false, error: 'Could not reach the server.', messageId: 'skills.error.network', messageParams: {} }
      }
    },
    [load],
  )

  return {
    // A persisted dev-cache entry can outlive an endpoint shape change. Revalidation runs
    // immediately, but render must not call array methods on that stale object first.
    skills: Array.isArray(query.data) ? (query.data as Skill[]) : [],
    loading: query.initialLoading,
    error: query.error instanceof Error ? query.error.message : null,
    errorMessageId: query.error instanceof SkillLoadError ? query.error.messageId : undefined,
    errorMessageParams: query.error instanceof SkillLoadError ? query.error.messageParams : undefined,
    refresh: () => {
      void load()
    },
    createSkill,
    updateSkill,
    deleteSkill,
  }
}
