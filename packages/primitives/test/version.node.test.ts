import { computed, shallowRef } from 'vue';
import { describe, expect, it } from 'vite-plus/test';
import { createVersion, versionOf } from '../src';

describe('a version of an imperative source', () => {
  it('reads the source again once a change is announced', () => {
    const source = { count: 1 };
    const version = createVersion();
    const shown = computed(() => version.read(() => source.count));

    expect(shown.value).toBe(1);

    source.count = 2;

    expect(shown.value).toBe(1);

    version.bump();

    expect(shown.value).toBe(2);
  });

  it('gives a new stamp for every announced change and tracks the stamp it gives', () => {
    const version = createVersion();
    const stamps = computed(() => version.stamp);
    const first = stamps.value;

    version.bump();
    version.bump();

    expect(stamps.value).toBe(first + 2);
  });

  it('reads under stamps someone else owns', () => {
    const owned = shallowRef(0);
    const source = { count: 1 };
    const version = versionOf(() => owned.value);
    const shown = computed(() => version.read(() => source.count));

    expect(shown.value).toBe(1);

    source.count = 3;
    owned.value += 1;

    expect(shown.value).toBe(3);
    expect(version.stamp).toBe(1);
  });
});
