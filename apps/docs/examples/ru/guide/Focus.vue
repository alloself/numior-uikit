<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiInput ref="search" v-model="query" label="Номер заказа" />
    <NuiButton variant="outline" tone="neutral" class="self-start" @click="search?.focus()">
      Перейти к поиску
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiButton, NuiInput } from '@numior/vue';

const query = ref('');
const search = useTemplateRef<InstanceType<typeof NuiInput>>('search');
</script>
