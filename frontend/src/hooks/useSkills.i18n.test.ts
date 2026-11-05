import { describe, expect, it } from 'vitest'
import { skillProblem } from './useSkills'

describe('skill API errors', () => {
  it('preserves identified errors and falls back to the original detail for old or malformed responses', async () => {
    const body = { detail: 'Unsafe path', message_id: 'skills.error.unsafePath', message_params: { path: '../a' } }
    expect(await skillProblem(new Response(JSON.stringify(body), { status: 400 }))).toEqual({ ok: false, error: 'Unsafe path', messageId: body.message_id, messageParams: body.message_params })
    expect(await skillProblem(new Response(JSON.stringify({ ...body, message_params: [] }), { status: 400 }))).toEqual({ ok: false, error: 'Unsafe path' })
    expect(await skillProblem(new Response(JSON.stringify({ detail: 'External detail' }), { status: 400 }))).toEqual({ ok: false, error: 'External detail' })
  })
})
