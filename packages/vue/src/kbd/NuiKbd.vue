<template>
  <kbd class="nui-kbd" :class="[`nui-kbd--size-${size}`, `nui-kbd--variant-${variant}`]">
    <template v-if="labels.length > 0">
      <kbd v-for="(label, index) in labels" :key="index" class="nui-kbd__key">{{ label }}</kbd>
    </template>
    <kbd v-else class="nui-kbd__key"><slot /></kbd>
  </kbd>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isApplePlatform, keyLabels } from './key-labels';
import { NuiKbdSize, NuiKbdVariant, type NuiKbdPlatform, type NuiKbdProps } from './kbd.types';

const {
  keys,
  size = NuiKbdSize.Md,
  variant = NuiKbdVariant.Boxed,
  platform,
} = defineProps<NuiKbdProps>();

defineSlots<{ default?(): unknown }>();

const detected = ref<NuiKbdPlatform>('other');
const labels = computed(() => keyLabels(keys, platform ?? detected.value));

onMounted(() => {
  detected.value = isApplePlatform() ? 'mac' : 'other';
});
</script>
