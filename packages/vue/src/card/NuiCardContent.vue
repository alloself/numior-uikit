<template>
  <div class="nui-card__content" :class="{ 'nui-card__content--loading': loading }">
    <NuiSkeleton v-if="loading" :lines="lines" />
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import NuiSkeleton from '../skeleton/NuiSkeleton.vue';
import { useCardLoading } from './card-context';
import type { NuiCardContentProps } from './card.types';

const { lines = 3 } = defineProps<NuiCardContentProps>();
const loading = useCardLoading();
</script>
