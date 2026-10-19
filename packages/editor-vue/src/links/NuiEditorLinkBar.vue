<template>
  <NuiPopover
    class="nui-editor-link-bar"
    :open="open"
    :anchor="anchor"
    mode="manual"
    :placement="inside ? 'bottom-end' : 'top-end'"
    :offset="inside ? 0 : 8"
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
      <NuiTooltip v-if="edit !== undefined" placement="bottom">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            size="sm"
            :icon="Pencil"
            :aria-label="edit.label"
            :aria-expanded="String(editing)"
            @click="editing = !editing"
          />
        </template>
        {{ edit.label }}
      </NuiTooltip>
    </div>
    <NuiPopover
      v-if="edit !== undefined"
      v-model:open="editing"
      :anchor="bar"
      placement="bottom-end"
      :offset="8"
    >
      <div v-if="editing" class="nui-editor-link-bar__edit">
        <NuiEditorLinkForm :edit="edit" @save="save" @cancel="cancel" />
      </div>
    </NuiPopover>
  </NuiPopover>
</template>

<script setup lang="ts">
import { Pencil } from '@lucide/vue';
import { NuiButton, NuiPopover, NuiTooltip } from '@numior/vue';
import { ref, useTemplateRef, watch } from 'vue';
import NuiEditorLinkForm from './NuiEditorLinkForm.vue';
import type { LinkBarAction, LinkChange, LinkEdit } from './links.types';

const {
  open,
  anchor,
  inside = false,
  label,
  actions,
  edit,
} = defineProps<{
  open: boolean;
  anchor: HTMLElement | null;
  inside?: boolean | undefined;
  label: string;
  actions: readonly LinkBarAction[];
  edit?: LinkEdit | undefined;
}>();

const emit = defineEmits<{ save: [change: LinkChange]; done: [] }>();

const bar = useTemplateRef<HTMLElement>('bar');
const editing = ref(false);

const save = (change: LinkChange): void => {
  editing.value = false;
  emit('save', change);
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
