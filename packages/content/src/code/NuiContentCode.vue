<template>
  <NuiCode class="nui-content__code-view" :code="text" :language="language" :title="title" />
</template>

<script setup lang="ts">
import { languageOf, useHighlighter } from '@numior/primitives';
import { NuiCode } from '@numior/vue';
import { computed } from 'vue';
import type { NuiContentViewProps } from '../content/content.types';
import { ContentNodeKind } from '@numior/editor-core';

const { node } = defineProps<NuiContentViewProps>();

const highlighter = useHighlighter();

const text = computed(() =>
  node.content.map((child) => (child.kind === ContentNodeKind.Text ? child.text : '')).join(''),
);

const language = computed(() =>
  typeof node.attrs.language === 'string' ? node.attrs.language : undefined,
);

const title = computed(() =>
  highlighter === null ? undefined : languageOf(highlighter, language.value)?.label,
);
</script>
