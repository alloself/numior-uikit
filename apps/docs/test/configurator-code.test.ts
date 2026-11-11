import { describe, expect, it } from 'vite-plus/test';
import type { ReferenceProp } from '../.vitepress/reference/reference.types';
import {
  boundValues,
  configuratorCode,
  configuratorState,
  resetState,
  sceneCode,
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

const SCENE = `<template>
  <NuiButton @click="open = true">Open</NuiButton>
  <NuiDialog v-model:open="open" v-bind="$attrs">
    <p>Text</p>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

defineOptions({ inheritAttrs: false });

const open = ref(false);
</script>
`;

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

  it('seeds a string prop from a localized value and keeps it on reset', () => {
    const text = PROPS.find((candidate) => candidate.kind === 'string');
    const seeds = text === undefined ? {} : { [text.name]: { ru: 'Имя', en: 'Name' } };
    const state = configuratorState(PROPS, seeds, 'en');
    expect(text === undefined ? 'Name' : state.strings[text.name]).toBe('Name');

    if (text !== undefined) {
      state.strings[text.name] = 'typed';
    }

    resetState(state, PROPS, seeds, 'ru');
    expect(text === undefined ? 'Имя' : state.strings[text.name]).toBe('Имя');
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

  it('leaves out a switched-off flag that has no default', () => {
    const flag = [prop({ name: 'invalid', kind: 'boolean', default: undefined })];
    const state = configuratorState(flag);

    expect(configuratorCode('NuiInput', flag, stateValues(state), undefined)).toBe(
      '<template>\n  <NuiInput />\n</template>',
    );

    state.flags.invalid = true;

    expect(configuratorCode('NuiInput', flag, stateValues(state), undefined)).toBe(
      '<template>\n  <NuiInput invalid />\n</template>',
    );
  });

  it('prints a scene without its plumbing and with the chosen props on the component', () => {
    const state = configuratorState(PROPS);

    expect(sceneCode(SCENE, 'NuiDialog', PROPS, stateValues(state))).toBe(
      SCENE.replace(' v-bind="$attrs"', '')
        .replace('defineOptions({ inheritAttrs: false });\n\n', '')
        .trimEnd(),
    );

    state.enums.variant = 'soft';
    state.numbers.max = 5;

    expect(sceneCode(SCENE, 'NuiDialog', PROPS, stateValues(state))).toContain(
      '\n  <NuiDialog variant="soft" :max="5" v-model:open="open">\n    <p>Text</p>',
    );

    expect(sceneCode(SCENE, 'NuiTree', PROPS, stateValues(state))).not.toContain('variant');
  });

  it('breaks the component tag of a scene into lines once it outgrows the line', () => {
    const state = configuratorState(PROPS);

    const source =
      '<template>\n  <NuiSelect v-model="manager" :options="managers" />\n</template>\n';

    state.strings.placeholder = 'Выберите менеджера, который ведёт этот заказ до доставки';

    expect(sceneCode(source, 'NuiSelect', PROPS, stateValues(state))).toBe(
      [
        '<template>',
        '  <NuiSelect',
        '    placeholder="Выберите менеджера, который ведёт этот заказ до доставки"',
        '    v-model="manager"',
        '    :options="managers"',
        '  />',
        '</template>',
      ].join('\n'),
    );
  });

  it('resets every map back to the defaults', () => {
    const state = configuratorState(PROPS);

    state.enums.variant = 'soft';
    state.flags.disabled = true;
    state.numbers.max = 3;
    state.strings.placeholder = 'x';
    resetState(state, PROPS);
    expect(state).toEqual(configuratorState(PROPS));
  });

  it('binds only the values that carry information', () => {
    expect(boundValues({ a: undefined, b: null, c: '', d: 'x', e: 0, f: false })).toEqual({
      d: 'x',
      e: 0,
      f: false,
    });
  });
});
