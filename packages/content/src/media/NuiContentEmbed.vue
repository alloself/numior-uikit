<template>
  <figure :class="['nui-content__embed', `nui-content__embed--provider-${provider}`]">
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
      allowfullscreen
    />
    <a v-else class="nui-content__embed-link" :href="url">{{ label }}</a>
    <figcaption v-if="caption !== ''" class="nui-content__caption">{{ caption }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { computed } from 'vue';
import type { NuiContentViewProps } from '../content/content.types';
import { EMBED_PRESETS, embedLabel, resolveEmbed, type NuiEmbedProvider } from '../content/embeds';
import { contentMessages } from './media.messages';

const { node, providers = Object.values(EMBED_PRESETS) } = defineProps<
  NuiContentViewProps & { providers?: readonly NuiEmbedProvider[] | undefined }
>();

const texts = useMessages(contentMessages);

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const url = computed(() => textOf(node.attrs.url));
const provider = computed(() => textOf(node.attrs.provider));
const caption = computed(() => textOf(node.attrs.caption));
const label = computed(() => embedLabel(provider.value));
const embed = computed(() => resolveEmbed(url.value, providers, provider.value));
</script>
