<template>
  <NuiDrawer v-model:open="open">
    <template v-if="title" #title>Custom title</template>
    <template v-if="description" #description>Custom description</template>
    <template v-if="body" #default>Body</template>
    <template v-if="footer" #footer>Apply</template>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDrawer } from '../../src';

const {
  title = false,
  description = false,
  body = false,
  footer = false,
} = defineProps<{
  title?: boolean | undefined;
  description?: boolean | undefined;
  body?: boolean | undefined;
  footer?: boolean | undefined;
}>();

const open = ref(true);
</script>
