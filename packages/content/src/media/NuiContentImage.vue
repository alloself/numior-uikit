<template>
  <span :class="classes" :style="width">
    <button type="button" class="nui-content__zoom" :aria-label="openText" @click="show">
      <img class="nui-content__picture" :src="src" :alt="alt" loading="lazy" />
    </button>
    <span v-if="caption !== ''" class="nui-content__caption">{{ caption }}</span>
    <NuiDialog
      v-if="mounted"
      v-model:open="open"
      class="nui-content__viewer"
      bare
      size="auto"
      :title="alt === '' ? texts.openImage : alt"
    >
      <img class="nui-content__lightbox" :src="src" :alt="alt" />
      <NuiButton
        class="nui-content__viewer-close"
        variant="soft"
        tone="neutral"
        size="sm"
        icon="x"
        :aria-label="texts.closeImage"
        @click="open = false"
      />
    </NuiDialog>
  </span>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiDialog } from '@numior/vue';
import { computed, ref } from 'vue';
import { imageWidthStyle } from '../content/content-schema';
import { NuiContentWrap, type NuiContentViewProps } from '../content/content.types';
import { contentMessages } from './media.messages';

const { node } = defineProps<NuiContentViewProps>();

const texts = useMessages(contentMessages);
const open = ref(false);
const mounted = ref(false);

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const src = computed(() => textOf(node.attrs.src));
const alt = computed(() => textOf(node.attrs.alt));
const wrap = computed(() => textOf(node.attrs.wrap) || 'inline');

const caption = computed(() =>
  wrap.value === NuiContentWrap.Inline ? '' : textOf(node.attrs.caption),
);

const width = computed(() => imageWidthStyle(node.attrs.width) ?? undefined);

const classes = computed(() => [
  'nui-content__image',
  `nui-content__image--wrap-${wrap.value}`,
  `nui-content__image--align-${textOf(node.attrs.align) || 'center'}`,
]);

const openText = computed(() =>
  alt.value === '' ? texts.value.openImage : texts.value.openNamedImage({ alt: alt.value }),
);

const show = (): void => {
  mounted.value = true;
  open.value = true;
};
</script>
