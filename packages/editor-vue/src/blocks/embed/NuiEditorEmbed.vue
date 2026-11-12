<template>
  <div class="nui-editor-embed">
    <div class="nui-editor-embed__frame">
      <span v-if="editable" ref="corner" class="nui-editor__corner" />
      <iframe
        v-if="embed !== undefined"
        class="nui-content__embed-frame"
        :src="embed.src"
        :title="texts.embedTitle({ provider: embed.provider.label })"
        :style="{ aspectRatio: String(embed.provider.aspect) }"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        allow="fullscreen; picture-in-picture; encrypted-media; clipboard-write"
        referrerpolicy="strict-origin-when-cross-origin"
      />
      <span v-else class="nui-content__embed-link">{{
        texts.embedUnavailable({ provider: label })
      }}</span>
      <div v-if="!(selected && focused)" class="nui-editor-embed__cover" />
      <NuiEditorLinkBar
        v-if="editable && tooled"
        :open="selected && focused"
        :anchor="corner"
        inside
        :label="texts.embed"
        :actions="actions"
        :edit="linkEdit"
        @save="save"
        @done="editor.focus()"
      />
    </div>
    <NuiEditorCaption :node="node" :editor="editor" :editable="editable" :selected="selected" />
  </div>
</template>

<script setup lang="ts">
import { Bookmark } from '@lucide/vue';
import { embedLabel } from '@numior/content';
import { useMessages } from '@numior/primitives';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import { useEditorLinkContext } from '../../links/links-context';
import type { LinkBarAction, LinkChange, LinkEdit } from '../../links/links.types';
import NuiEditorLinkBar from '../../links/NuiEditorLinkBar.vue';
import type { NuiEditorBlockViewProps } from '../block.types';
import NuiEditorCaption from '../caption/NuiEditorCaption.vue';

const { node, selected, focused, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);
const links = useEditorLinkContext();
const corner = useTemplateRef<HTMLElement>('corner');
const tooled = ref(selected);

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const url = computed(() => textOf(node.attrs.url));
const provider = computed(() => textOf(node.attrs.provider));
const label = computed(() => embedLabel(provider.value));
const embed = computed(() => links?.embedOf(url.value, provider.value));

const actions = computed((): LinkBarAction[] => [
  { key: 'open', label: texts.value.openLink, icon: 'external-link', href: url.value },
  {
    key: 'bookmark',
    label: texts.value.toBookmark,
    icon: Bookmark,
    run: () => {
      links?.turn(node.id, 'bookmark');
    },
  },
]);

const linkEdit = computed((): LinkEdit => ({
  url: url.value,
  label: texts.value.linkEdit,
  valid: (next) => links?.accepts('embed', next) === true,
  invalidText: texts.value.embedInvalid,
}));

const save = (change: LinkChange): void => {
  links?.change(node.id, change);
};

watch(
  () => selected,
  (value) => {
    tooled.value ||= value;
  },
);
</script>
