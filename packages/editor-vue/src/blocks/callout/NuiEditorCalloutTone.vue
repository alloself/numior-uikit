<template>
  <span v-if="!editable" class="nui-editor-callout__mark">
    <NuiIcon :alias="tone" />
  </span>
  <NuiMenu v-else :items="items" :label="texts.tone" placement="bottom-start">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-callout__tone"
        variant="ghost"
        tone="neutral"
        size="sm"
        :icon="tone"
        :aria-label="texts.calloutTone({ tone })"
        @mousedown.prevent
      />
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiIcon, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockViewProps } from '../block.types';
import { calloutToneOf, toneEntries } from './callout-tones';

const { node, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);

const tone = computed(() => calloutToneOf(node.attrs.tone));

const items = computed((): NuiMenuEntry[] => toneEntries(tone.value, editor, texts.value));
</script>
