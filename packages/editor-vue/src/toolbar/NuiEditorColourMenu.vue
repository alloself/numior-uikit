<template>
  <NuiMenu :label="texts.colour" class="nui-editor-colours" lazy>
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-toolbar__control nui-editor-colours__trigger"
        variant="ghost"
        tone="neutral"
        size="sm"
        tabindex="-1"
        :icon-only="true"
        :aria-label="texts.colour"
        :disabled="disabled || colours.disabled"
      >
        <span
          class="nui-editor-colours__mark"
          :class="
            colours.colour === null ? undefined : `nui-editor-colours--text-${colours.colour}`
          "
        >
          <NuiIcon :icon="Baseline" />
        </span>
      </NuiButton>
    </template>
    <template v-if="colours.colours.length > 0">
      <NuiMenuLabel>{{ texts.textColour }}</NuiMenuLabel>
      <NuiMenuRadioGroup
        :model-value="colours.colour ?? ''"
        @update:model-value="choose('color', $event)"
      >
        <NuiMenuRadioItem v-for="option in textOptions" :key="option.value" :value="option.value">
          <span class="nui-editor-colours__option">
            <span
              class="nui-editor-colours__swatch nui-editor-colours__swatch--text"
              :class="option.modifier"
              aria-hidden="true"
            />
            {{ option.label }}
          </span>
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
        <NuiMenuRadioItem v-for="option in fillOptions" :key="option.value" :value="option.value">
          <span class="nui-editor-colours__option">
            <span
              class="nui-editor-colours__swatch nui-editor-colours__swatch--fill"
              :class="option.modifier"
              aria-hidden="true"
            />
            {{ option.label }}
          </span>
        </NuiMenuRadioItem>
      </NuiMenuRadioGroup>
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { Baseline } from '@lucide/vue';
import { useMessages } from '@numior/primitives';
import {
  NuiButton,
  NuiIcon,
  NuiMenu,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
} from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { ColourMark, ColourOption, NuiEditorColourMenuProps } from './toolbar.types';

const { colours, disabled = false } = defineProps<NuiEditorColourMenuProps>();

const emit = defineEmits<{
  choose: [mark: ColourMark, name: string | null];
}>();

const texts = useMessages(editorMessages);

const optionsOf = (
  names: readonly string[],
  kind: 'text' | 'fill',
  none: string,
): ColourOption[] => [
  { value: '', label: none, modifier: undefined },
  ...names.map((name) => ({
    value: name,
    label: texts.value.colourName({ name }),
    modifier: `nui-editor-colours--${kind}-${name}`,
  })),
];

const textOptions = computed(() => optionsOf(colours.colours, 'text', texts.value.defaultColour));

const fillOptions = computed(() => optionsOf(colours.highlights, 'fill', texts.value.noHighlight));

const choose = (mark: ColourMark, value: string | undefined): void => {
  emit('choose', mark, value === undefined || value === '' ? null : value);
};
</script>
