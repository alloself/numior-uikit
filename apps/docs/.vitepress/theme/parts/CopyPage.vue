<template>
  <div class="nui-not-prose absolute top-7 end-6 z-1">
    <span class="max-sm:hidden">
      <NuiButton variant="ghost" tone="neutral" size="sm" :icon="icon" @click="copy">
        {{ texts.copyPage }}
      </NuiButton>
    </span>
    <span class="sm:hidden">
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="sm"
        :icon="icon"
        :aria-label="clipboard.copied.value ? texts.copied : texts.copyPage"
        @click="copy"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@numior/primitives';
import { NuiButton } from '@numior/vue';
import type { CopyPageProps } from '../theme.types';

const MARKDOWN = 'text/markdown';

const { path, texts } = defineProps<CopyPageProps>();

const clipboard = useClipboard();

const icon = computed(() => (clipboard.copied.value ? 'check' : 'copy'));

const load = async (): Promise<string> => {
  const response = await fetch(path, { headers: { Accept: MARKDOWN } });

  if (!response.ok) {
    throw new Error(`No Markdown for ${path}`);
  }
  return response.text();
};

const copy = (): void => {
  void clipboard.copy(load());
};
</script>
