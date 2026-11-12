<template>
  <div class="flex w-full flex-col gap-3">
    <NuiAlert v-model:open="open" tone="warning" title="Loft stool out of stock" dismissible>
      Customers see it in the catalog but cannot order it.
      <template #actions>
        <NuiButton size="sm" tone="warning" @click="open = false">Order from supplier</NuiButton>
        <NuiButton size="sm" variant="outline" tone="warning" @click="open = false">
          Hide from storefront
        </NuiButton>
      </template>
    </NuiAlert>
    <NuiButton
      v-if="!open"
      class="self-start"
      size="sm"
      variant="ghost"
      tone="neutral"
      @click="open = true"
    >
      Show again
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAlert, NuiButton } from '@numior/vue';

const open = ref(true);
</script>
