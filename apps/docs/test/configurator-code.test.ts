import { describe, expect, it } from 'vitest';
import type { ReferenceProp } from '../.vitepress/reference/reference.types';
import {
  boundValues,
  configuratorCode,
  configuratorState,
  stateValues,
} from '../.vitepress/theme/configurator-code';

const prop = (overrides: Partial<ReferenceProp>): ReferenceProp => ({
  name: 'x',
  type: 'string',
  kind: 'string',
  required: false,
  default: undefined,
  values: undefined,
  description: undefined,
  ...overrides,
});

const PROPS: readonly ReferenceProp[] = [
  prop({ name: 'variant', kind: 'enum', default: '"solid"', values: ['solid', 'soft'] }),
  prop({ name: 'disabled', kind: 'boolean', default: 'false' }),
  prop({ name: 'loop', kind: 'boolean', default: 'true' }),
  prop({ name: 'max', kind: 'number', default: undefined }),
  prop({ name: 'placeholder', kind: 'string', default: undefined }),
];

describe('configurator code', () => {
  it('seeds typed state from the defaults of each prop kind', () => {
    expect(configuratorState(PROPS)).toEqual({
      enums: { variant: 'solid' },
      flags: { disabled: false, loop: true },
      numbers: { max: null },
      strings: { placeholder: '' },
    });
  });

  it('prints only the attributes that differ from the defaults', () => {
    const state = configuratorState(PROPS);

    expect(configuratorCode('NuiButton', PROPS, stateValues(state), 'Save')).toBe(
      '<template>\n  <NuiButton>Save</NuiButton>\n</template>',
    );

    state.enums.variant = 'soft';
    state.flags.disabled = true;
    state.flags.loop = false;
    state.numbers.max = 5;
    state.strings.placeholder = 'Name';

    expect(configuratorCode('NuiButton', PROPS, stateValues(state), '')).toBe(
      '<template>\n  <NuiButton variant="soft" disabled :loop="false" :max="5" placeholder="Name" />\n</template>',
    );
  });

  it('binds only the values that carry information', () => {
    expect(boundValues({ a: undefined, b: null, c: '', d: 'x', e: 0, f: false })).toEqual({
      d: 'x',
      e: 0,
      f: false,
    });
  });
});
