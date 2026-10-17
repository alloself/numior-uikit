<template>
  <div class="nui-editor-code">
    <NuiPopover
      v-if="editable"
      v-model:open="picking"
      placement="bottom-start"
      padding="sm"
      @toggle="onToggle"
    >
      <template #trigger="{ attrs }">
        <NuiButton
          v-bind="attrs"
          class="nui-editor-code__language"
          variant="ghost"
          tone="neutral"
          size="xs"
          icon-end="chevron-down"
          :aria-label="`${texts.codeLanguage}: ${label}`"
          @mousedown.prevent
        >
          {{ label }}
        </NuiButton>
      </template>
      <NuiCommand
        ref="languages"
        v-model:query="search"
        class="nui-editor-code__languages"
        :items="items"
        :selected="known?.id ?? language ?? PLAIN"
        :label="texts.codeLanguage"
        :placeholder="texts.codeLanguageSearch"
        @select="choose"
      />
    </NuiPopover>
    <span v-else class="nui-editor-code__label">{{ label }}</span>
    <NuiButton
      class="nui-editor-code__copy"
      variant="ghost"
      tone="neutral"
      size="xs"
      :icon="clipboard.copied.value ? 'check' : 'copy'"
      :aria-label="clipboard.copied.value ? texts.codeCopied : texts.copyCode"
      @mousedown.prevent
      @click="copy"
    />
  </div>
</template>

<script setup lang="ts">
import { languageOf, useClipboard, useHighlighter, useMessages } from '@numior/primitives';
import { NuiButton, NuiCommand, NuiPopover, type NuiCommandItem } from '@numior/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockViewProps } from '../block.types';
import { codeTextOf } from './code-text';

const PLAIN = '';

const { node, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);
const highlighter = useHighlighter();
const clipboard = useClipboard();
const picking = ref(false);
const search = ref('');
const languages = useTemplateRef<{ focus(): void }>('languages');

const language = computed(() =>
  typeof node.attrs.language === 'string' ? node.attrs.language : null,
);

const known = computed(() =>
  highlighter === null ? undefined : languageOf(highlighter, language.value),
);

const label = computed(() => known.value?.label ?? language.value ?? texts.value.codePlain);

const items = computed((): NuiCommandItem[] => [
  { value: PLAIN, label: texts.value.codePlain },
  ...(highlighter?.languages ?? []).map((entry) => ({
    value: entry.id,
    label: entry.label,
    keywords: [...(entry.aliases ?? [])],
  })),
]);

const onToggle = (event: Event): void => {
  if (!('newState' in event)) {
    return;
  }
  if (event.newState === 'open') {
    languages.value?.focus();
  } else {
    search.value = '';
  }
};

const choose = (item: NuiCommandItem): void => {
  picking.value = false;
  editor.setAttrs({ language: item.value === PLAIN ? null : item.value });
  editor.focus();
};

const copy = (): void => {
  void clipboard.copy(codeTextOf(node));
};
</script>
