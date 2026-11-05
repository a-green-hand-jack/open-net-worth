import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProfileDisplayGate } from '../src/main/profile-display-gate';

test('notice waits for profile display state and runs once when it arrives', () => {
  const gate = new ProfileDisplayGate(1_000);
  const events: string[] = [];
  gate.finishLoading();
  gate.request(() => events.push('notice'), () => events.push('fallback'));
  assert.deepEqual(events, []);
  gate.markReady();
  gate.markReady();
  assert.deepEqual(events, ['notice']);
  gate.dispose();
});

test('a profile response before the notice request opens the notice immediately', () => {
  const gate = new ProfileDisplayGate(1_000);
  const events: string[] = [];
  gate.finishLoading();
  gate.markReady();
  gate.request(() => events.push('notice'), () => events.push('fallback'));
  assert.deepEqual(events, ['notice']);
  gate.dispose();
});

test('missing profile falls back without a duplicate notice, and reset cancels stale work', async () => {
  const gate = new ProfileDisplayGate(5);
  const events: string[] = [];
  gate.request(() => events.push('stale'), () => events.push('stale fallback'));
  gate.reset();
  gate.finishLoading();
  gate.request(() => events.push('notice'), () => events.push('fallback'));
  await new Promise(resolve => setTimeout(resolve, 30));
  gate.markReady();
  assert.deepEqual(events, ['fallback', 'notice']);
  gate.dispose();
});

test('old-page profile responses cannot release the notice during navigation', () => {
  const gate = new ProfileDisplayGate(1_000);
  const events: string[] = [];
  gate.reset();
  gate.markReady();
  assert.equal(gate.acceptsProfile, false);
  gate.finishLoading();
  gate.request(() => events.push('notice'), () => events.push('fallback'));
  assert.deepEqual(events, []);
  gate.markReady();
  assert.deepEqual(events, ['notice']);
  gate.dispose();
});

test('the moved-copy banner is immediate while the modal waits for profile data', () => {
  const gate = new ProfileDisplayGate(1_000);
  const events: string[] = [];
  gate.finishLoading();
  gate.requestWithBanner(() => events.push('banner'), () => events.push('modal'), () => events.push('fallback'));
  assert.deepEqual(events, ['banner']);
  gate.markReady();
  assert.deepEqual(events, ['banner', 'modal']);
  gate.dispose();
});

test('the moved-copy banner remains immediate when profile synchronization times out', async () => {
  const gate = new ProfileDisplayGate(5);
  const events: string[] = [];
  gate.finishLoading();
  gate.requestWithBanner(() => events.push('banner'), () => events.push('modal'), () => events.push('fallback'));
  assert.deepEqual(events, ['banner']);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(events, ['banner', 'fallback', 'modal']);
  gate.dispose();
});
