<template>
  <NuiMenu :label="texts.colour" class="nui-editor-colours">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-toolbar__control nui-editor-colours__trigger"
        :class="colours.colour === null ? undefined : `nui-editor-colours--text-${colours.colour}`"
        variant="ghost"
        tone="neutral"
        size="sm"
        tabindex="-1"
        icon="text-colour"
        :aria-label="texts.colour"
        :disabled="disabled || colours.disabled"
      />
    </template>
    <template v-if="colours.colours.length > 0">
      <NuiMenuLabel>{{ texts.textColour }}</NuiMenuLabel>
      <NuiMenuRadioGroup
        :model-value="colours.colour ?? ''"
        @update:model-value="choose('color', $event)"
      >
        <NuiMenuRadioItem value="">
          <span
            class="nui-editor-colours__swatch nui-editor-colours__swatch--text"
            aria-hidden="true"
          />
          {{ texts.defaultColour }}
        </NuiMenuRadioItem>
        <NuiMenuRadioItem v-for="name in colours.colours" :key="name" :value="name">
          <span
            class="nui-editor-colours__swatch nui-editor-colours__swatch--text"
            :class="`nui-editor-colours--text-${name}`"
            aria-hidden="true"
          />
          {{ texts.colourName({ name }) }}
        </NuiMenuRadioItem>
      </NuiMenuRadioGroup>
    </template>
    <NuiMenuSeparator v-if="colours.colours.length > 0 && colours.highlights.length > 0" />
    <template v-if="colours.highlights.length > 0">
      <NuiMenuLabel>{{ texts.highlight }}</NuiMenuLabel>
      <NuiMenuRadioGroup
        :model-value="colours.highlight ?? ''"
        @update:model-value="choose('highlight', $event)"
      >
        <NuiMenuRadioItem value="">
          <span
            class="nui-editor-colours__swatch nui-editor-colours__swatch--fill"
            aria-hidden="true"
          />
          {{ texts.noHighlight }}
        </NuiMenuRadioItem>
        <NuiMenuRadioItem v-for="name in colours.highlights" :key="name" :value="name">
          <span
            class="nui-editor-colours__swatch nui-editor-colours__swatch--fill"
            :class="`nui-editor-colours--fill-${name}`"
            aria-hidden="true"
          />
          {{ texts.colourName({ name }) }}
        </NuiMenuRadioItem>
      </NuiMenuRadioGroup>
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import {
  NuiButton,
  NuiMenu,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
} from '@numior/vue';
import { editorMessages } from '../editor/editor.messages';
import type { ColourMark, NuiEditorColourMenuProps } from './toolbar.types';

const { colours, disabled = false } = defineProps<NuiEditorColourMenuProps>();

const emit = defineEmits<{
  choose: [mark: ColourMark, name: string | null];
}>();

const texts = useMessages(editorMessages);

const choose = (mark: ColourMark, value: string | undefined): void => {
  emit('choose', mark, value === undefined || value === '' ? null : value);
};
</script>
