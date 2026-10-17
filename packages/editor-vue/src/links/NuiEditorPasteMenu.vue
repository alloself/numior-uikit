<template>
  <NuiMenu
    ref="menu"
    v-model:open="open"
    class="nui-editor-paste"
    :anchor="anchor"
    :items="items"
    :label="texts.pasteAs"
    placement="bottom-start"
  />
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiMenu, type NuiMenuEntry, type NuiMenuExposed } from '@numior/vue';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { LinkKind, PastedLink } from './links.types';

const { pasted, anchor, provider, bookmark } = defineProps<{
  pasted: PastedLink | undefined;
  anchor: HTMLElement | null;
  provider: string | undefined;
  bookmark: boolean;
}>();

const emit = defineEmits<{ choose: [kind: LinkKind]; dismiss: [] }>();

const texts = useMessages(editorMessages);
const menu = useTemplateRef<NuiMenuExposed>('menu');
const open = ref(false);
let chosen = false;

const choose = (kind: LinkKind): void => {
  chosen = true;
  emit('choose', kind);
};

const items = computed((): NuiMenuEntry[] => [
  ...(provider === undefined
    ? []
    : [
        {
          label: texts.value.pasteEmbed({ provider }),
          icon: 'embed',
          onSelect: () => {
            choose('embed');
          },
        },
      ]),
  ...(bookmark
    ? [
        {
          label: texts.value.bookmark,
          icon: 'bookmark',
          onSelect: () => {
            choose('bookmark');
          },
        },
      ]
    : []),
  {
    label: texts.value.pasteLink,
    icon: 'link',
    onSelect: () => {
      emit('dismiss');
    },
  },
]);

watch(
  () => pasted,
  (value) => {
    if (value !== undefined && (provider !== undefined || bookmark)) {
      chosen = false;
      menu.value?.show('first');
    } else {
      open.value = false;
    }
  },
);

watch(open, (value) => {
  if (!value && !chosen && pasted !== undefined) {
    emit('dismiss');
  }
});
</script>
