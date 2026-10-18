import { describe, expect, it } from 'vite-plus/test';
import {
  control,
  controlProps,
  defineControls,
  isString,
  optional,
  provideControls,
  useControls,
} from '../src';
import Echo from './fixtures/EchoControl.vue';
import { captureSetup } from './harness/capture';

const text = control(Echo, isString, { props: controlProps({ placeholder: optional(isString) }) });

describe('control registry', () => {
  it('describes a control by its component, model, value guard and a strict props guard', () => {
    expect(text.component).toBe(Echo);
    expect(text.model).toBe('modelValue');
    expect([text.accepts('a'), text.accepts(1)]).toEqual([true, false]);

    expect([
      text.props({ placeholder: 'x' }),
      text.props({}),
      text.props({ placeholder: 1 }),
      text.props({ unknown: 'x' }),
    ]).toEqual([true, true, false, false]);

    expect(control(Echo, isString).props({ anything: 1 })).toBe(true);
  });

  it('reaches descendants only when provided', () => {
    const registry = defineControls({ text });

    expect(captureSetup(() => useControls()).value).toBeNull();

    expect(
      captureSetup(() => useControls(), { layers: [() => provideControls(registry)] }).value,
    ).toBe(registry);
  });
});
