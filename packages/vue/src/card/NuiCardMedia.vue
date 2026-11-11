<template>
  <div
    class="nui-card__media"
    :class="{ 'nui-card__media--loading': loading }"
    :style="{ '--_aspect': aspect }"
  >
    <NuiSkeleton v-if="loading" shape="rect" height="100%" class="nui-card__skeleton" />
    <img v-else-if="src" class="nui-card__image" :src="src" :alt="alt" />
    <slot v-else><NuiIcon icon="image" class="nui-card__placeholder" /></slot>
  </div>
</template>

<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import NuiSkeleton from '../skeleton/NuiSkeleton.vue';
import { useCardLoading } from './card-context';
import type { NuiCardMediaProps } from './card.types';

const { src, alt = '', aspect = '16 / 9' } = defineProps<NuiCardMediaProps>();
const loading = useCardLoading();
</script>
