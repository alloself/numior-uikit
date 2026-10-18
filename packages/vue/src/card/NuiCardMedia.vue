<template>
  <div class="nui-card__media" :style="{ '--_aspect': aspect }">
    <img v-if="src" class="nui-card__image" :src="src" :alt="alt" />
    <slot v-else><NuiIcon icon="image" class="nui-card__placeholder" /></slot>
  </div>
</template>

<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiCardMediaProps } from './card.types';

const { src, alt = '', aspect = '16 / 9' } = defineProps<NuiCardMediaProps>();
</script>
