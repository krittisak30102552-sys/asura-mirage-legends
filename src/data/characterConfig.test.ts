import test from 'node:test';
import assert from 'node:assert/strict';
import characterConfig, { getCharacterAnimationFrameCount, getCharacterConfig } from './characterConfig.ts';

test('Ginzo normal and awakened use seven frames', () => {
  assert.equal(getCharacterAnimationFrameCount('ginzo'), 7);
  assert.equal(getCharacterAnimationFrameCount('ginzo', true), 7);
  assert.equal(getCharacterConfig('ginzo', true).artStyle, 'golden-aura-proportional');
  assert.equal(getCharacterConfig('ginzo', true).isGoldenAwakened, true);
});
test('Catherine uses eight smooth frames', () => {
  assert.equal(getCharacterAnimationFrameCount('katherine'), 8);
  assert.equal(getCharacterConfig('katherine').artStyle, 'smooth-digital-proportional');
});
test('Quan and Bamdee retain smooth non-pixel art with the default 12-frame cycle', () => {
  assert.equal(getCharacterAnimationFrameCount('quan'), 12);
  assert.equal(getCharacterAnimationFrameCount('bamdee'), 12);
  assert.equal(getCharacterConfig('quan').artStyle, 'refined-clean-non-pixel');
  assert.equal(getCharacterConfig('bamdee').artStyle, 'refined-clean-non-pixel');
});
test('every character form preserves original stats and skills', () => {
  for (const item of Object.values(characterConfig)) {
    assert.equal(item.preserveStats, true);
    assert.equal(item.damageMultiplier, 1.0);
    assert.equal(item.skills, 'original');
  }
});
