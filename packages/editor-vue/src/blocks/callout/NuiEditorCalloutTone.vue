<template>
  <NuiMenu :items="items" :label="texts.tone" placement="bottom-start">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-callout__tone"
        variant="ghost"
        tone="neutral"
        size="sm"
        :icon="tone"
        :disabled="!editable"
        :aria-label="texts.calloutTone({ tone })"
        @mousedown.prevent
      />
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockViewProps } from '../block.types';
import { calloutToneOf, toneEntries } from './callout-tones';

const { node, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);

const tone = computed(() => calloutToneOf(node.attrs.tone));

const items = computed((): NuiMenuEntry[] => toneEntries(tone.value, editor, texts.value));
</script>
