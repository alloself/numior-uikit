<template>
  <NuiButton variant="outline" @click="open = true">Filters</NuiButton>
  <NuiDrawer v-model:open="open" title="Filters" description="Order list settings">
    <div class="flex flex-col gap-3">
      <NuiInput v-model="query" label="Customer" placeholder="Name or company" />
      <NuiSelect v-model="status" :options="statuses" label="Status" clearable />
      <NuiSwitch v-model="onlyMine">Only my orders</NuiSwitch>
    </div>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Reset</NuiButton>
      <NuiButton @click="open = false">Apply</NuiButton>
    </template>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDrawer, NuiInput, NuiSelect, NuiSwitch } from '@numior/vue';

const open = ref(false);
const query = ref('');
const status = ref<string | null>(null);
const onlyMine = ref(true);

const statuses = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'cancelled', label: 'Cancelled' },
];
</script>
