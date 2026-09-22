import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useCheckedState } from './useCheckedState';

describe('useCheckedState', () => {
  it('toggles a boolean model', () => {
    const model = ref<boolean | string[] | undefined>(undefined);
    const state = useCheckedState(model, 'a');
    expect(state.checked.value).toBe(false);
    state.setChecked(true);
    expect(model.value).toBe(true);
    expect(state.checked.value).toBe(true);
    state.setChecked(false);
    expect(model.value).toBe(false);
  });

  it('adds and removes its value in an array model, keeping the others', () => {
    const model = ref<boolean | string[] | undefined>(['b']);
    const state = useCheckedState(model, () => 'a');
    expect(state.checked.value).toBe(false);
    state.setChecked(true);
    expect(model.value).toEqual(['b', 'a']);
    expect(state.checked.value).toBe(true);
    state.setChecked(true);
    expect(model.value).toEqual(['b', 'a']);
    state.setChecked(false);
    expect(model.value).toEqual(['b']);
  });

  it('leaves an array model untouched without an own value', () => {
    const model = ref<boolean | string[] | undefined>(['b']);
    const state = useCheckedState(model);
    state.setChecked(true);
    expect(model.value).toEqual(['b']);
    expect(state.checked.value).toBe(false);
  });
});
