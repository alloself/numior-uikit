<template>
  <component
    :is="editable ? 'div' : 'a'"
    ref="card"
    class="nui-content__bookmark-link"
    :href="editable ? undefined : url"
  >
    <span class="nui-content__bookmark-body">
      <span class="nui-content__bookmark-title">{{
        loading ? texts.linkLoading : title || url
      }}</span>
      <span v-if="description !== ''" class="nui-content__bookmark-description">{{
        description
      }}</span>
      <span class="nui-content__bookmark-site">
        <img v-if="icon !== ''" class="nui-content__bookmark-icon" :src="icon" alt="" />
        {{ site }}
      </span>
    </span>
    <img v-if="image !== ''" class="nui-content__bookmark-image" :src="image" alt="" />
  </component>
  <NuiEditorLinkBar
    v-if="editable && tooled"
    :open="selected && focused"
    :anchor="card"
    :label="texts.bookmark"
    :actions="actions"
    :edit="linkEdit"
    @save="save"
    @done="editor.focus()"
  />
</template>

<script setup lang="ts">
import { SquarePlay } from '@lucide/vue';
import { webAddress } from '@numior/content';
import { useMessages } from '@numior/primitives';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import { useEditorLinkContext } from '../../links/links-context';
import type { LinkBarAction, LinkChange, LinkEdit } from '../../links/links.types';
import NuiEditorLinkBar from '../../links/NuiEditorLinkBar.vue';
import type { NuiEditorBlockViewProps } from '../block.types';

const { node, selected, focused, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);
const links = useEditorLinkContext();
const tooled = ref(selected);
const card = useTemplateRef<HTMLElement>('card');

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const url = computed(() => textOf(node.attrs.url));
const title = computed(() => textOf(node.attrs.title));
const description = computed(() => textOf(node.attrs.description));
const image = computed(() => textOf(node.attrs.image));
const icon = computed(() => textOf(node.attrs.icon));

const site = computed(
  () => textOf(node.attrs.site) || (webAddress(url.value)?.hostname ?? url.value),
);

const loading = computed(() => links?.loading.has(node.id) === true);

const actions = computed((): LinkBarAction[] => [
  { key: 'open', label: texts.value.openLink, icon: 'external-link', href: url.value },
  ...(links?.previews === true
    ? [
        {
          key: 'refresh',
          label: texts.value.linkRefresh,
          icon: 'refresh',
          run: () => {
            links.refresh(node.id);
          },
        } satisfies LinkBarAction,
      ]
    : []),
  ...(links?.embedOf(url.value) === undefined
    ? []
    : [
        {
          key: 'embed',
          label: texts.value.toEmbed,
          icon: SquarePlay,
          run: () => {
            links.turn(node.id, 'embed');
          },
        } satisfies LinkBarAction,
      ]),
]);

const linkEdit = computed((): LinkEdit => ({
  url: url.value,
  label: texts.value.bookmarkEdit,
  valid: (next) => links?.accepts('bookmark', next) === true,
  invalidText: texts.value.mediaInvalid,
  details: { title: title.value, description: description.value },
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
