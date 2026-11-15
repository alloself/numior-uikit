import { describe, expect, it } from 'vite-plus/test';
import { McpLocale, type McpData } from '../src/data.types';
import { fixtureButton, fixtureData } from './fixtures/data';
import { CheckedFile } from './harness/checked-file';

const ICONS = [
  'add',
  'bell',
  'check',
  'copy',
  'edit',
  'eye',
  'file',
  'home',
  'link',
  'menu',
  'plus',
  'save',
  'trash',
];

const manyIcons: McpData = {
  ...fixtureData,
  components: {
    ...fixtureData.components,
    NuiButton: {
      ...fixtureButton,
      props: fixtureButton.props.map((prop) =>
        prop.name === 'icon' ? { ...prop, values: ICONS } : prop,
      ),
    },
  },
};

const STYLED = `
<script setup lang="ts">
import { NuiButton, NuiSelect } from '@numior/vue';
import '@numior/vue/styles.css';
</script>
`;

describe('check_usage', () => {
  it('finds nothing in a file that uses the kit as documented', () => {
    const file = CheckedFile.of(`<template>
  <NuiButton variant="soft" tone="error" icon="trash" icon-only aria-label="Delete" @click="remove" />
  <NuiSelect v-model="city" :options="cities" size="sm" @load="more" />
</template>
${STYLED}
<style scoped>
.toolbar { display: flex; }
.toolbar > .action { margin: 0; }
</style>
`);

    expect(file.diagnostics).toEqual([]);
  });

  it('names the nearest component for a misspelt tag in either case', () => {
    const file = CheckedFile.of(`<template>
  <NuiButon />
  <nui-selct />
</template>`);

    expect(file.codes).toEqual(['unknown-component', 'unknown-component']);
    expect(file.lines).toEqual([2, 3]);
    expect(file.hints).toEqual(['Did you mean `NuiButton`?', 'Did you mean `NuiSelect`?']);
  });

  it('leaves alone a local component that shares the prefix and follows an import alias', () => {
    const file = CheckedFile.of(`<template>
  <NuiFancy />
  <Action varient="soft" />
</template>
<script setup lang="ts">
import NuiFancy from './NuiFancy.vue';
import { NuiButton as Action } from '@numior/vue';
import '@numior/vue/styles.css';
</script>`);

    expect(file.messages).toEqual(['`NuiButton` has no prop `varient`.']);
  });

  it('warns about a prop the component does not declare and lets native attributes through', () => {
    const file = CheckedFile.of(`<template>
  <NuiButton varient="soft" :tonee="color" type="submit" data-test="save" class="w-full" />
</template>
${STYLED}`);

    expect(file.codes).toEqual(['unknown-prop', 'unknown-prop']);
    expect(file.severities).toEqual(['warning', 'warning']);
    expect(file.hints).toEqual(['Did you mean `variant`?', 'Did you mean `tone`?']);
  });

  it('warns about a model the component does not have', () => {
    const file = CheckedFile.of(`<template>
  <NuiDialog v-model:visible="shown" />
  <NuiDialog v-model:open="shown" />
</template>`);

    expect(file.messages).toContain('`NuiDialog` has no `v-model:visible`.');
    expect(file.hints).toContain('Its models: `v-model:open`.');
    expect(file.codes.filter((code) => code === 'unknown-prop')).toHaveLength(1);
  });

  it('warns about an event the component does not emit and keeps native and model events', () => {
    const file = CheckedFile.of(`<template>
  <NuiSelect :options="[]" @lod="more" @update:model-value="pick" @focusin="track" />
  <NuiDialog @closed="reset" />
</template>
${STYLED}`);

    expect(file.codes).toEqual(['unknown-event', 'unknown-event']);
    expect(file.hints).toEqual(['Did you mean `load`?', 'Did you mean `close`?']);
  });

  it('rejects a value outside the enumeration and names the prop that takes it', () => {
    const file = CheckedFile.of(`<template>
  <NuiButton variant="primary" />
  <NuiButton :variant="'outlne'" icon="delete" />
</template>
${STYLED}`);

    expect(file.codes).toEqual(['invalid-value', 'invalid-value', 'invalid-value']);
    expect(file.messages[0]).toBe('`NuiButton` does not accept `variant="primary"`.');

    expect(file.hints).toEqual([
      'Use one of: `solid`, `soft`, `outline`. `primary` is a value of `tone`.',
      'Use one of: `solid`, `soft`, `outline`. Did you mean `outline`?',
      'Use one of: `check`, `trash`.',
    ]);
  });

  it('asks to bind a number that a static attribute would pass as text', () => {
    const file = CheckedFile.of(`<template>
  <NuiTable row-height="40" />
  <NuiTable :row-height="40" />
</template>
<script setup lang="ts">
import '@numior/vue/styles.css';
import '@numior/table/styles.css';
</script>`);

    expect(file.hints).toEqual(['Use one of: `auto`. Bind a number as `:rowHeight="40"`.']);
  });

  it('points to the reference instead of printing a long enumeration', () => {
    const file = CheckedFile.of(
      `<template><NuiButton icon="sav" /></template>${STYLED}`,
      {},
      manyIcons,
    );

    expect(file.hints).toEqual([
      'It takes one of 13 values; get_component NuiButton lists them. Did you mean `save`?',
    ]);
  });

  it('reports an import of a name the package does not export with the package that does', () => {
    const file = CheckedFile.of(`<script setup lang="ts">
import { NuiButon, NuiForm, type NuiButtonVariant } from '@numior/vue';
import Kit from '@numior/vue';
import { anything } from '@numior/unknown';
import * as kit from '@numior/vue';
</script>`);

    expect(file.codes).toEqual(['unknown-export', 'unknown-export', 'unknown-export']);
    expect(file.lines).toEqual([2, 2, 3]);

    expect(file.hints).toEqual([
      'Did you mean `NuiButton`?',
      '`NuiForm` is exported by `@numior/forms`.',
      "Import names in braces: `import { … } from '@numior/vue'`.",
    ]);
  });

  it('warns once per component whose stylesheets this file does not import', () => {
    const file = CheckedFile.of(`<template>
  <NuiSelect :options="[]" />
  <NuiSelect :options="[]" />
  <NuiButton />
</template>
<script setup lang="ts">
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/button.css';
</script>`);

    expect(file.codes).toEqual(['missing-styles']);
    expect(file.lines).toEqual([2]);
    expect(file.messages).toEqual(['The styles of `NuiSelect` are not imported in this file.']);

    expect(file.hints[0]).toBe(
      'Import `@numior/vue/styles/list.css`, `@numior/vue/styles/select.css` or `@numior/vue/styles.css`. If the app entry (main.ts or a global CSS file) already imports them, ignore this warning.',
    );
  });

  it('takes the stylesheets from a style block import and from the package bundles', () => {
    const file = CheckedFile.of(`<template>
  <NuiSelect :options="[]" />
  <NuiTable />
</template>
<style>
@import '@numior/vue/styles.css';
@import url('@numior/table/styles.css');
</style>`);

    expect(file.diagnostics).toEqual([]);
  });

  it('warns about selectors that restyle a block, a part or a modifier of the kit', () => {
    const file = CheckedFile.of(`<template>
  <div class="toolbar"><slot /></div>
</template>
${STYLED}
<style scoped>
.toolbar :deep(.nui-select__trigger) { border-radius: 0; }
.nui-button--loading { opacity: 1; }
.card .nui-button { height: 2rem; }
.nui-button:hover > .icon { color: red; }
.toolbar {
  & .nui-button__content { padding: 0; }
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>`);

    expect(file.codes).toEqual([
      'style-override',
      'style-override',
      'style-override',
      'style-override',
    ]);

    expect(file.lines).toEqual([11, 12, 13, 16]);

    expect(file.messages).toEqual([
      '`.toolbar :deep(.nui-select__trigger)` restyles the part `nui-select__trigger` of `NuiSelect` from outside.',
      '`.nui-button--loading` restyles the modifier `nui-button--loading` of `NuiButton` from outside.',
      '`.card .nui-button` restyles the block `nui-button` of `NuiButton` from outside.',
      '`.toolbar .nui-button__content` restyles the part `nui-button__content` of `NuiButton` from outside.',
    ]);

    expect(file.hints[0]).toBe(
      'Change its look through props (`size`), your own wrapper element or theme tokens (list_tokens). It reads `--nui-border`, `--nui-radius`.',
    );

    expect(file.hints[2]).toBe(
      'Change its look through props (`variant`), your own wrapper element or theme tokens (list_tokens). It reads `--nui-control-height-md`. To place it (width, margin, grid), put a class on your own wrapper.',
    );
  });

  it('counts only global selectors of a CSS module and reads SCSS line comments', () => {
    const file = CheckedFile.of(`<template>
  <div :class="$style.bar" />
</template>
<style module lang="scss">
// local classes are renamed
.nui-button { color: red; }
:global(.nui-button__spinner) { opacity: 0.5; }
</style>`);

    expect(file.codes).toEqual(['style-override']);
    expect(file.lines).toEqual([7]);
  });

  it('reports a style block it cannot parse and keeps checking the rest', () => {
    const file = CheckedFile.of(`<template>
  <NuiButon />
</template>
<style>
.toolbar { color: red;
</style>`);

    expect(file.codes).toEqual(['unknown-component', 'parse-error']);
    expect(file.lines).toEqual([2, 5]);
  });

  it('reports markup the SFC parser rejects', () => {
    const file = CheckedFile.of('<template>\n  <div>\n</template>\n');

    expect(file.codes).toEqual(['parse-error']);
    expect(file.lines).toEqual([2]);
  });

  it('reports a script it cannot parse', () => {
    const file = CheckedFile.of(`<script setup lang="ts">
import { NuiButton } from '@numior/vue'
const = 1;
</script>`);

    expect(file.codes).toEqual(['parse-error']);
  });

  it('points to the reference when no name is close', () => {
    const file = CheckedFile.of(
      `<template>
  <NuiQuantumFlux />
  <NuiButton zzzzzzzz="1" @qqqqqqqq="x" v-model:shown="y" />
</template>
<script setup lang="ts">
import { qwertyuiop } from '@numior/vue';
</script>
<style>
.nui-dialog__panel { color: red; }
</style>`,
      {},
      { ...fixtureData, packageStyles: {} },
    );

    expect(file.hints).toEqual([
      'list_components shows the available components.',
      'Import `@numior/vue/styles/button.css`. If the app entry (main.ts or a global CSS file) already imports them, ignore this warning.',
      'get_component NuiButton lists its props and models.',
      'get_component NuiButton lists its events.',
      '`NuiButton` has no models.',
      'list_components shows the components and their packages.',
      'Change its look through props, your own wrapper element or theme tokens (list_tokens).',
    ]);
  });

  it('speaks Russian when asked', () => {
    const file = CheckedFile.of('<template><NuiButton varient="soft" /></template>', {
      locale: McpLocale.Ru,
    });

    expect(file.messages).toEqual([
      'Стили `NuiButton` не подключены в этом файле.',
      'У `NuiButton` нет свойства `varient`.',
    ]);

    expect(file.hints).toEqual([
      'Подключите `@numior/vue/styles/button.css` или `@numior/vue/styles.css`. Если их уже подключает точка входа (main.ts или общий CSS-файл), предупреждение можно не учитывать.',
      'Возможно, имелось в виду `variant`.',
    ]);
  });

  it('gives every Russian hint a close name or the tool that lists the names', () => {
    const file = CheckedFile.of(
      `<template>
  <NuiButon />
  <NuiQuantumFlux />
  <NuiButton zzzzzzzz="1" variant="primary" :variant="'outlne'" @qqqqqqqq="x" v-model:shown="y" />
  <NuiSelect v-model:shown="y" @lod="x" />
  <NuiTable row-height="40" />
</template>
<script setup lang="ts">
import { NuiForm, NuiButon, qwertyuiop } from '@numior/vue';
import Kit from '@numior/vue';
</script>
<style>
.nui-dialog__panel { color: red; }
.bar .nui-button { height: 1px; }
</style>`,
      { locale: McpLocale.Ru },
      { ...fixtureData, packageStyles: {} },
    );

    expect(file.messages).toEqual([
      'В Numior UI нет компонента `NuiButon`.',
      'В Numior UI нет компонента `NuiQuantumFlux`.',
      'Стили `NuiButton` не подключены в этом файле.',
      'У `NuiButton` нет свойства `zzzzzzzz`.',
      '`NuiButton` не принимает `variant="primary"`.',
      '`NuiButton` не принимает `variant="outlne"`.',
      'У `NuiButton` нет события `qqqqqqqq`.',
      'У `NuiButton` нет `v-model:shown`.',
      'Стили `NuiSelect` не подключены в этом файле.',
      'У `NuiSelect` нет `v-model:shown`.',
      'У `NuiSelect` нет события `lod`.',
      'Стили `NuiTable` не подключены в этом файле.',
      '`NuiTable` не принимает `rowHeight="40"`.',
      'В `@numior/vue` нет экспорта `NuiForm`.',
      'В `@numior/vue` нет экспорта `NuiButon`.',
      'В `@numior/vue` нет экспорта `qwertyuiop`.',
      'В `@numior/vue` нет экспорта по умолчанию.',
      '`.nui-dialog__panel` стилизует снаружи часть `nui-dialog__panel` компонента `NuiDialog`.',
      '`.bar .nui-button` стилизует снаружи блок `nui-button` компонента `NuiButton`.',
    ]);

    expect(file.hints).toEqual([
      'Возможно, имелся в виду `NuiButton`.',
      'Список компонентов показывает list_components.',
      'Подключите `@numior/vue/styles/button.css`. Если их уже подключает точка входа (main.ts или общий CSS-файл), предупреждение можно не учитывать.',
      'Свойства и модели `NuiButton` показывает get_component.',
      'Допустимые значения: `solid`, `soft`, `outline`. `primary` — значение свойства `tone`.',
      'Допустимые значения: `solid`, `soft`, `outline`. Возможно, имелось в виду `outline`.',
      'События `NuiButton` показывает get_component.',
      'У `NuiButton` нет моделей.',
      'Подключите `@numior/vue/styles/field.css`, `@numior/vue/styles/list.css`, `@numior/vue/styles/select.css`. Если их уже подключает точка входа (main.ts или общий CSS-файл), предупреждение можно не учитывать.',
      'Модели компонента: `v-model`.',
      'Возможно, имелось в виду `load`.',
      'Подключите `@numior/vue/styles.css`, `@numior/table/styles.css`, `@numior/table/styles/table.css`. Если их уже подключает точка входа (main.ts или общий CSS-файл), предупреждение можно не учитывать.',
      'Допустимые значения: `auto`. Число передайте привязкой: `:rowHeight="40"`.',
      '`NuiForm` экспортирует `@numior/forms`.',
      'Возможно, имелось в виду `NuiButton`.',
      'Компоненты и их пакеты показывает list_components.',
      "Импортируйте имена в фигурных скобках: `import { … } from '@numior/vue'`.",
      'Меняйте вид через свойства, свою обёртку или токены темы (list_tokens).',
      'Меняйте вид через свойства (`variant`), свою обёртку или токены темы (list_tokens). Компонент читает `--nui-control-height-md`. Чтобы разместить компонент (ширина, отступы, сетка), дайте класс своей обёртке.',
    ]);
  });
});
