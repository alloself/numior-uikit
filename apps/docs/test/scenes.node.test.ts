import { describe, expect, it } from 'vite-plus/test';
import { sceneProblems, type SceneSource } from '../.vitepress/reference/scenes';

const ROOT_SCENE = `<template>
  <NuiSelect v-model="manager" :options="managers" />
</template>
`;

const NESTED_SCENE = `<template>
  <NuiButton @click="open = true">Open</NuiButton>
  <NuiDialog v-model:open="open" close-on-backdrop v-bind="$attrs">Text</NuiDialog>
</template>
`;

const WRAPPED_SCENE = `<template>
  <div class="flex">
    <NuiDialog v-bind="$attrs">Text</NuiDialog>
  </div>
</template>
`;

const sameIn =
  (source: string | undefined): SceneSource =>
  () =>
    source;

describe('configurator scenes', () => {
  it('accepts a scene whose only root is the component', () => {
    const configurator = { props: ['size', 'label'], scene: 'select/Example' };

    expect(sceneProblems('NuiSelect', configurator, sameIn(ROOT_SCENE))).toEqual([]);
    expect(sceneProblems('NuiSelect', { props: ['size'] }, sameIn(undefined))).toEqual([]);
    expect(sceneProblems('NuiSelect', undefined, sameIn(undefined))).toEqual([]);
  });

  it('asks for the example in both locales and for the component in it', () => {
    const configurator = { props: ['size'], scene: 'select/Example' };

    const russianOnly: SceneSource = (locale) => (locale === 'ru' ? ROOT_SCENE : undefined);

    expect(sceneProblems('NuiSelect', configurator, russianOnly)).toEqual([
      'NuiSelect: configurator scene en/select/Example has no example',
    ]);

    expect(sceneProblems('NuiTree', configurator, sameIn(ROOT_SCENE))).toEqual([
      'NuiTree: configurator scene ru/select/Example does not render <NuiTree>',
      'NuiTree: configurator scene en/select/Example does not render <NuiTree>',
    ]);
  });

  it('rejects a configured prop that the scene sets itself, in any spelling', () => {
    const configurator = {
      props: ['size', 'open', 'closeOnBackdrop', 'modelValue', 'options'],
      scene: 'x/Example',
    };

    const russian: SceneSource = (locale) => (locale === 'ru' ? NESTED_SCENE : ROOT_SCENE);

    expect(sceneProblems('NuiDialog', { ...configurator, scene: 'x/Example' }, russian)).toEqual([
      'NuiDialog: configurator scene ru/x/Example sets the configured prop "open" itself',
      'NuiDialog: configurator scene ru/x/Example sets the configured prop "closeOnBackdrop" itself',
      'NuiDialog: configurator scene en/x/Example does not render <NuiDialog>',
    ]);

    expect(sceneProblems('NuiSelect', configurator, sameIn(ROOT_SCENE))).toEqual([
      'NuiSelect: configurator scene ru/x/Example sets the configured prop "modelValue" itself',
      'NuiSelect: configurator scene ru/x/Example sets the configured prop "options" itself',
      'NuiSelect: configurator scene en/x/Example sets the configured prop "modelValue" itself',
      'NuiSelect: configurator scene en/x/Example sets the configured prop "options" itself',
    ]);
  });

  it('checks that the chosen props reach a component that is not the only root', () => {
    const configurator = { props: ['size'], scene: 'x/Example' };
    const unbound = NESTED_SCENE.replace(' v-bind="$attrs"', '');
    const owned = `${WRAPPED_SCENE}<script setup lang="ts">\ndefineOptions({ inheritAttrs: false });\n</script>\n`;

    expect(sceneProblems('NuiDialog', configurator, sameIn(NESTED_SCENE))).toEqual([]);
    expect(sceneProblems('NuiDialog', configurator, sameIn(owned))).toEqual([]);

    expect(sceneProblems('NuiDialog', configurator, sameIn(unbound))[0]).toBe(
      'NuiDialog: configurator scene ru/x/Example does not pass attributes to the component: make it the only root or bind $attrs',
    );

    expect(sceneProblems('NuiDialog', configurator, sameIn(WRAPPED_SCENE))[0]).toBe(
      'NuiDialog: configurator scene ru/x/Example passes attributes to both the root and the component: set inheritAttrs to false',
    );
  });

  it('rejects slot content next to a scene', () => {
    const configurator = {
      props: ['size'],
      scene: 'select/Example',
      content: { ru: 'Текст', en: 'Text' },
    };

    expect(sceneProblems('NuiSelect', configurator, sameIn(ROOT_SCENE))).toEqual([
      'NuiSelect: configurator content has no effect next to the scene select/Example',
    ]);
  });
});
