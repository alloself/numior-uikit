<template>
  <NuiButton
    variant="ghost"
    tone="neutral"
    size="sm"
    class="nui-code__copy"
    :class="{ 'nui-code__copy--floating': floating }"
    :aria-label="label"
    @click="emit('copy')"
  >
    <NuiIcon alias="copy" class="nui-code__glyph nui-code__glyph--copy" />
    <NuiIcon alias="check" class="nui-code__glyph nui-code__glyph--done" />
  </NuiButton>
</template>

<script setup lang="ts">
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiCodeCopyProps } from './code.types';

const { label, floating = false } = defineProps<NuiCodeCopyProps>();

const emit = defineEmits<{ copy: [] }>();
</script>
