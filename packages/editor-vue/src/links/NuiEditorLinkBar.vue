<template>
  <NuiPopover
    class="nui-editor-link-bar"
    :open="open"
    :anchor="anchor"
    mode="manual"
    placement="top-end"
    :offset="8"
    padding="sm"
    size="auto"
  >
    <div ref="bar" class="nui-editor-link-bar__actions" role="toolbar" :aria-label="label">
      <NuiTooltip v-for="action in actions" :key="action.key" placement="bottom">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            size="sm"
            :icon="action.icon"
            :aria-label="action.label"
            :href="action.href"
            :target="action.href === undefined ? undefined : '_blank'"
            :rel="action.href === undefined ? undefined : 'noopener'"
            @click="action.run?.()"
          />
        </template>
        {{ action.label }}
      </NuiTooltip>
      <NuiTooltip v-if="address !== undefined" placement="bottom">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            size="sm"
            icon="pencil"
            :aria-label="texts.linkEdit"
            :aria-expanded="String(editing)"
            @click="editing = !editing"
          />
        </template>
        {{ texts.linkEdit }}
      </NuiTooltip>
    </div>
    <NuiPopover
      v-if="address !== undefined"
      v-model:open="editing"
      :anchor="bar"
      placement="bottom-end"
      :offset="8"
    >
      <div v-if="editing" class="nui-editor-link-bar__edit">
        <NuiEditorMediaLink
          :value="address.url"
          :valid="address.valid"
          :invalid-text="address.invalidText"
          :submit="texts.linkSave"
          @link="save"
          @cancel="cancel"
        />
      </div>
    </NuiPopover>
  </NuiPopover>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiPopover, NuiTooltip } from '@numior/vue';
import { ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import NuiEditorMediaLink from '../uploads/NuiEditorMediaLink.vue';
import type { LinkAddress, LinkBarAction } from './links.types';

const { open, anchor, label, actions, address } = defineProps<{
  open: boolean;
  anchor: HTMLElement | null;
  label: string;
  actions: readonly LinkBarAction[];
  address?: LinkAddress | undefined;
}>();

const emit = defineEmits<{ relink: [url: string]; done: [] }>();

const texts = useMessages(editorMessages);
const bar = useTemplateRef<HTMLElement>('bar');
const editing = ref(false);

const save = (url: string): void => {
  editing.value = false;
  emit('relink', url);
  emit('done');
};

const cancel = (): void => {
  editing.value = false;
  emit('done');
};

watch(
  () => open,
  (value) => {
    editing.value &&= value;
  },
);
</script>
