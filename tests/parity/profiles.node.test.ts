import { describe, expect, it } from 'vite-plus/test';
import { PROFILES } from './profiles';
import type { Profile } from './parity.types';

const sameView = (left: Profile, right: Profile): boolean =>
  left.target === right.target &&
  left.scheme === right.scheme &&
  left.width === right.width &&
  left.height === right.height &&
  left.direction === right.direction &&
  left.density === right.density &&
  left.accent === right.accent;

describe('parity profiles', () => {
  it('records motion frames only at a whole device pixel ratio', () => {
    const fractional = PROFILES.filter(
      (profile) => profile.motion && !Number.isInteger(profile.dpr),
    );

    expect(fractional.map((profile) => profile.id)).toEqual([]);
  });

  it('gives every state profile at a fractional ratio a twin that records its motion', () => {
    const missing = PROFILES.filter(
      (profile) =>
        profile.states &&
        !profile.motion &&
        !PROFILES.some((twin) => twin.motion && twin.states && sameView(twin, profile)),
    );

    expect(missing.map((profile) => profile.id)).toEqual([]);
  });

  it('names every profile once', () => {
    const ids = PROFILES.map((profile) => profile.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
