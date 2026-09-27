<template>
  <section class="panel" aria-labelledby="chrome-title">
    <div class="section-heading">
      <h2 id="chrome-title">Оформление интерфейса</h2>
      <span class="tag">NuiSeparator · NuiKbd · NuiCode</span>
    </div>
    <div class="nui-flex nui-flex-col nui-gap-4">
      <div class="nui-flex nui-items-center nui-gap-3" data-testid="chrome-toolbar">
        <NuiButton variant="ghost" tone="neutral" size="sm">Файл</NuiButton>
        <NuiSeparator orientation="vertical" data-testid="separator-vertical" />
        <NuiButton variant="ghost" tone="neutral" size="sm">Правка</NuiButton>
        <NuiSeparator orientation="vertical" decorative data-testid="separator-decorative" />
        <NuiKbd keys="mod+k" data-testid="kbd-combo" />
      </div>
      <NuiSeparator data-testid="separator-horizontal" />
      <NuiSeparator label="или" data-testid="separator-labelled" />
      <p class="nui-text-sm nui-text-muted">
        Нажмите <NuiKbd :keys="['mod+shift+p']" size="sm" data-testid="kbd-list" /> для палитры
        команд или <NuiKbd variant="plain" data-testid="kbd-plain">Esc</NuiKbd> для выхода.
      </p>
      <NuiCode
        :code="sample"
        :tokens="sampleTokens"
        title="main.ts"
        line-numbers
        :highlight="[2]"
        :max-lines="3"
        data-testid="code-titled"
      />
      <NuiCode :code="plain" language="sh" data-testid="code-plain" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { NuiButton, NuiCode, NuiKbd, NuiSeparator, type NuiCodeLine } from '@numior/vue';

const sample = [
  "import { NuiButton } from '@numior/vue';",
  '',
  "const label = ref('Сохранить');",
  'const loading = ref(false);',
  '',
  'const save = async () => {',
  '  loading.value = true;',
  '};',
  '',
].join('\n');

const sampleTokens: readonly NuiCodeLine[] = [
  [
    { text: 'import', scope: 'keyword' },
    { text: ' { NuiButton } ' },
    { text: 'from', scope: 'keyword' },
    { text: " '@numior/vue'", scope: 'string' },
    { text: ';', scope: 'punctuation' },
  ],
  [{ text: '' }],
  [
    { text: 'const', scope: 'keyword' },
    { text: ' label = ' },
    { text: 'ref', scope: 'function' },
    { text: "('Сохранить')", scope: 'string' },
    { text: ';', scope: 'punctuation' },
  ],
  [
    { text: 'const', scope: 'keyword' },
    { text: ' loading = ' },
    { text: 'ref', scope: 'function' },
    { text: '(' },
    { text: 'false', scope: 'keyword' },
    { text: ');', scope: 'punctuation' },
  ],
  [{ text: '' }],
  [
    { text: 'const', scope: 'keyword' },
    { text: ' save = ' },
    { text: 'async', scope: 'keyword' },
    { text: ' () => {' },
  ],
  [
    { text: '  loading.' },
    { text: 'value', scope: 'property' },
    { text: ' = ' },
    { text: 'true', scope: 'keyword' },
    { text: ';', scope: 'punctuation' },
  ],
  [{ text: '};' }],
];

const plain = 'pnpm add @numior/vue @numior/tokens\n';
</script>
