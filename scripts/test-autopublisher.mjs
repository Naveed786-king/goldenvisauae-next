// Unit tests for the Auto Publisher pure helpers.  Run: npm run test:autopublisher
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonLoose, maskKey, isMasked, maskSecrets, unmaskSecrets, scrubSecrets, deepMerge, parseCustomTitle, dayKey } from '../src/lib/autopublisher/pure.ts';
import { COPIED_SLUGS } from '../src/lib/autopublisher/copied-slugs.ts';

test('parseJsonLoose handles fences, prose and trailing commas', () => {
  assert.deepEqual(parseJsonLoose('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Sure! Here it is: {"a":[1,2,],} thanks'), { a: [1, 2] });
  assert.deepEqual(parseJsonLoose('[{"q":"x"}]'), [{ q: 'x' }]);
  assert.equal(parseJsonLoose('no json here'), null);
  assert.equal(parseJsonLoose(''), null);
});

test('keys are masked and restored', () => {
  assert.equal(maskKey('sk-abcdef1234'), '••••••1234');
  assert.equal(maskKey(''), '');
  assert.ok(isMasked('••••••1234'));
  const stored = { providers: { openai: { key: 'sk-real-9999', model: 'm' } } };
  const shown = maskSecrets(stored);
  assert.equal(shown.providers.openai.key, '••••••9999');
  assert.equal(shown.providers.openai.model, 'm');
  // masked value sent back keeps the stored key, a new value replaces it
  assert.equal(unmaskSecrets(shown, stored).providers.openai.key, 'sk-real-9999');
  assert.equal(unmaskSecrets({ providers: { openai: { key: ' sk-new ' } } }, stored).providers.openai.key, 'sk-new');
});

test('secrets are scrubbed from log text', () => {
  const s = scrubSecrets('failed ?key=AIzaSyA1234567890abcdefghijk and Bearer sk-or-v1-abcdefghijklmnop');
  assert.ok(!s.includes('AIzaSyA1234567890'));
  assert.ok(!s.includes('abcdefghijklmnop'));
});

test('deepMerge keeps defaults and replaces arrays', () => {
  const d = deepMerge({ a: 1, n: { x: 1, y: 2 }, list: [1, 2] }, { n: { y: 5 }, list: [9] });
  assert.deepEqual(d, { a: 1, n: { x: 1, y: 5 }, list: [9] });
});

test('custom title lines parse in any order', () => {
  assert.deepEqual(parseCustomTitle('Golden Visa for nurses | 2026-11-05 | Golden Visa | /uploads/media/a.webp'), { title: 'Golden Visa for nurses', date: '2026-11-05', category: 'Golden Visa', image: '/uploads/media/a.webp' });
  assert.deepEqual(parseCustomTitle('Only a title'), { title: 'Only a title' });
  assert.equal(parseCustomTitle('  | 2026-01-01'), null);
});

test('dayKey uses Dubai time', () => {
  assert.equal(dayKey(new Date('2026-10-25T21:30:00Z')), '2026-10-26');
});

test('copied slugs list is complete and unique', () => {
  assert.equal(COPIED_SLUGS.length, 93);
  assert.equal(new Set(COPIED_SLUGS).size, 93);
});
