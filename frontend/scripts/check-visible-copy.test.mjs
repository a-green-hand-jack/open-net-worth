import { spawnSync } from 'node:child_process'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'

test('rejects conditional and template visible copy but ignores technical expressions', () => {
  const run = (path) => spawnSync(process.execPath, ['scripts/check-visible-copy.mjs', path], { encoding: 'utf8' })
  const positive = run('scripts/fixtures/visible-positive')
  assert.equal(positive.status, 1)
  assert.match(positive.stderr, /Visible condition/)
  assert.match(positive.stderr, /Visible fallback/)
  assert.match(positive.stderr, /Visible template/)
  const negative = run('scripts/fixtures/visible-negative')
  assert.equal(negative.status, 0, negative.stderr)
})
