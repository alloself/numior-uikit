<script setup lang="ts">
import { computed } from 'vue';
import { useIcons } from '@numior/primitives';
import { defaultIcons } from './default-icons';
import type { NuiIconProps } from './icon.types';

const props = defineProps<NuiIconProps>();
const icons = useIcons();
const resolved = computed(() => {
  if (props.icon) return props.icon;
  return props.alias ? (icons[props.alias] ?? defaultIcons[props.alias]) : undefined;
});
</script>

<template>
  <component
    :is="resolved"
    v-if="resolved"
    class="nui-icon"
    aria-hidden="true"
    focusable="false"
    :data-alias="alias"
  />
</template>
