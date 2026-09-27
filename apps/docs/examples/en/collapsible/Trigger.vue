<template>
  <NuiCollapsible v-model:open="open">
    <template #trigger="{ open: expanded }">{{
      expanded ? 'Hide details' : 'Show details'
    }}</template>
    <p class="nui-m-0 nui-text-sm nui-text-muted">
      Order 4812 is packed at the warehouse and handed to the courier.
    </p>
  </NuiCollapsible>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCollapsible } from '@numior/vue';

const open = ref(true);
</script>
