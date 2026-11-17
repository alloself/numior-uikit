<template>
  <div class="flex h-full flex-col gap-3 p-3">
    <NuiInput
      v-model="query"
      type="search"
      placeholder="Name or city"
      aria-label="Search customers"
    />
    <div class="min-h-0 flex-1 overflow-auto">
      <NuiList
        v-model="selected"
        :items="items"
        selectable="single"
        label="Customers"
        empty-label="No customers found"
        @select="emit('open')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiInput, NuiList } from '@numior/kit';
import type { Customer } from '#demo/customers';

const { customers } = defineProps<{ customers: readonly Customer[] }>();

const emit = defineEmits<{ open: [] }>();

const selected = defineModel<number | null>({ default: null });
const query = defineModel<string>('query', { default: '' });

const items = computed(() =>
  customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
    description: `${customer.city} · ${customer.orders} orders`,
  })),
);
</script>
