import { describe, expect, it } from 'vite-plus/test';
import { nextTick, ref } from 'vue';
import { useControlId } from '../src';
import { captureSetup } from './harness/capture';

describe('useControlId', () => {
  it('generates a stable id and prefers an explicit one', async () => {
    const explicit = ref<string | undefined>(undefined);
    const id = captureSetup(() => useControlId(explicit)).value;
    const generated = id.value;
    expect(generated).toBeTruthy();
    expect(id.value).toBe(generated);
    explicit.value = 'custom';
    await nextTick();
    expect(id.value).toBe('custom');
  });
});
