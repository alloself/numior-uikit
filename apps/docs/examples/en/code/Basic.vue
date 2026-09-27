<template>
  <NuiCode
    :code="source"
    :tokens="tokens"
    title="main.ts"
    language="ts"
    line-numbers
    :highlight="[3]"
  />
</template>

<script setup lang="ts">
import { NuiCode, type NuiCodeLine } from '@numior/vue';

const source = [
  "import { NuiButton } from '@numior/vue';",
  '',
  "const label = ref('Save');",
  'const loading = ref(false);',
].join('\n');

const tokens: readonly NuiCodeLine[] = [
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
    { text: '(' },
    { text: "'Save'", scope: 'string' },
    { text: ');', scope: 'punctuation' },
  ],
  [
    { text: 'const', scope: 'keyword' },
    { text: ' loading = ' },
    { text: 'ref', scope: 'function' },
    { text: '(' },
    { text: 'false', scope: 'keyword' },
    { text: ');', scope: 'punctuation' },
  ],
];
</script>
