<template>
  <p class="nui-card__description" :class="{ 'nui-card__description--loading': loading }">
    <NuiSkeleton v-if="loading" :width="DESCRIPTION_WIDTH" />
    <slot v-else />
  </p>
</template>

<script setup lang="ts">
import NuiSkeleton from '../skeleton/NuiSkeleton.vue';
import { useCardLoading } from './card-context';

const DESCRIPTION_WIDTH = '80%';

const loading = useCardLoading();
</script>
