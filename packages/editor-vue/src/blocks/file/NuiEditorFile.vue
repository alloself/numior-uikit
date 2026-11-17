<template>
  <span class="nui-content__file-icon" aria-hidden="true"><NuiIcon :icon="icon" /></span>
  <span class="nui-content__file-name">{{ name }}</span>
  <span v-if="size !== undefined" class="nui-content__file-size">{{ size }}</span>
  <NuiEditorLinkBar
    v-if="editable && tooled"
    :open="selected && focused"
    :anchor="element"
    :label="texts.file"
    :actions="actions"
    @done="editor.focus()"
  />
</template>

<script setup lang="ts">
import { Download } from '@lucide/vue';
import { CONTENT_FILE_ICONS, fileKindOf } from '@numior/content';
import { formatFileSize, useLocale, useMessages } from '@numior/primitives';
import { NuiIcon } from '@numior/vue';
import { useEventListener } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import NuiEditorLinkBar from '../../links/NuiEditorLinkBar.vue';
import type { LinkBarAction } from '../../links/links.types';
import type { NuiEditorBlockViewProps } from '../block.types';
import { follow } from '../image/image-size';

const { node, element, selected, focused, editable, editor } =
  defineProps<NuiEditorBlockViewProps>();

const locale = useLocale();
const texts = useMessages(editorMessages);
const tooled = ref(selected);

const name = computed(() => (typeof node.attrs.name === 'string' ? node.attrs.name : ''));
const url = computed(() => (typeof node.attrs.url === 'string' ? node.attrs.url : ''));
const type = computed(() => (typeof node.attrs.type === 'string' ? node.attrs.type : ''));
const icon = computed(() => CONTENT_FILE_ICONS[fileKindOf(type.value, name.value)]);

const size = computed(() =>
  typeof node.attrs.size === 'number' ? formatFileSize(node.attrs.size, locale.value) : undefined,
);

const actions = computed((): readonly LinkBarAction[] => [
  {
    key: 'download',
    label: texts.value.download,
    icon: Download,
    run: () => {
      follow(element, url.value, true);
    },
  },
  {
    key: 'open',
    label: texts.value.openLink,
    icon: 'external-link',
    run: () => {
      follow(element, url.value, false);
    },
  },
]);

watch(
  () => selected,
  (value) => {
    tooled.value ||= value;
  },
);

useEventListener(
  () => element,
  'click',
  (event: MouseEvent) => {
    if (!editable || event.ctrlKey || event.metaKey) {
      return;
    }

    event.preventDefault();
  },
);
</script>
