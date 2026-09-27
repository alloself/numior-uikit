<template>
  <Suspense>
    <SignatureView :names="resolvedNames" />
  </Suspense>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SignatureProps } from '../theme.types';
import SignatureView from './SignatureView.vue';

const { name, names } = defineProps<SignatureProps>();

const resolvedNames = computed(() => names ?? (name === undefined ? [] : [name]));
</script>
