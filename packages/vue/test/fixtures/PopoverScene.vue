<template>
  <div>
    <NuiPopover v-bind="props" v-model:open="open">
      <template #trigger="{ attrs }">
        <button v-bind="attrs" class="opener">Open</button>
      </template>
      <a href="#profile">Content</a>
    </NuiPopover>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiPopover, type NuiPopoverProps } from '../../src';

const { props = {}, initiallyOpen = false } = defineProps<{
  props?: NuiPopoverProps | undefined;
  initiallyOpen?: boolean | undefined;
}>();

const open = ref(initiallyOpen);

defineExpose({ open });
</script>
