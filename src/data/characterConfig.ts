import type { HeroId } from '../types/game';

export type CharacterArtStyle = 'smooth-digital-proportional' | 'golden-aura-proportional' | 'refined-clean-non-pixel';
export interface CharacterVisualConfig {
  name: string;
  artStyle: CharacterArtStyle;
  animationFrames?: number;
  isGoldenAwakened?: boolean;
  preserveStats: true;
  damageMultiplier: 1.0;
  skills: 'original';
}

// Visual configuration only. Combat stats and skill definitions stay unchanged.
const characterConfig: Record<HeroId | 'ginzoAwakened', CharacterVisualConfig> = {
  ginzo: { name: 'Ginzo', artStyle: 'smooth-digital-proportional', animationFrames: 7, isGoldenAwakened: false, preserveStats: true, damageMultiplier: 1.0, skills: 'original' },
  ginzoAwakened: { name: 'Ginzo Awakened', artStyle: 'golden-aura-proportional', animationFrames: 7, isGoldenAwakened: true, preserveStats: true, damageMultiplier: 1.0, skills: 'original' },
  katherine: { name: 'Catherine', artStyle: 'smooth-digital-proportional', animationFrames: 8, preserveStats: true, damageMultiplier: 1.0, skills: 'original' },
  quan: { name: 'Quan', artStyle: 'refined-clean-non-pixel', preserveStats: true, damageMultiplier: 1.0, skills: 'original' },
  bamdee: { name: 'Bamdee', artStyle: 'refined-clean-non-pixel', preserveStats: true, damageMultiplier: 1.0, skills: 'original' },
};
export function getCharacterConfig(heroId: HeroId, isGinzoEvolved = false): CharacterVisualConfig {
  return heroId === 'ginzo' && isGinzoEvolved ? characterConfig.ginzoAwakened : characterConfig[heroId];
}
export function getCharacterAnimationFrameCount(heroId: HeroId, isGinzoEvolved = false): number {
  return getCharacterConfig(heroId, isGinzoEvolved).animationFrames ?? 12;
}
export default characterConfig;
