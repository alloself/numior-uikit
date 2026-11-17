<template>
  <NuiCombobox
    v-model:values="tags"
    :options="options"
    :custom-value="(text) => text"
    label="Product tags"
    description="Type a tag and press Enter to add it"
    multiple
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOptionSource } from '@numior/kit';

const tags = ref(['new', 'sale']);

const options: NuiOptionSource<string> = [
  { value: 'new', label: 'New' },
  { value: 'sale', label: 'On sale' },
  { value: 'preorder', label: 'Made to order' },
  { value: 'bestseller', label: 'Bestseller' },
];
</script>
