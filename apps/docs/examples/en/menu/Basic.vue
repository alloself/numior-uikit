<template>
  <div class="flex flex-col items-start gap-3">
    <NuiMenu>
      <template #trigger="{ attrs }">
        <NuiButton v-bind="attrs" variant="outline" tone="neutral" icon-end="chevron-down">
          Actions
        </NuiButton>
      </template>
      <NuiMenuItem icon="copy" shortcut="mod+d" @select="done = 'A copy of order 20408 is ready.'">
        Duplicate
      </NuiMenuItem>
      <NuiMenuItem
        :icon="Printer"
        shortcut="mod+p"
        @select="done = 'The packing slip is printing.'"
      >
        Print packing slip
      </NuiMenuItem>
      <NuiMenuSub label="Send to customer" icon="inbox">
        <NuiMenuItem @select="done = 'The invoice went to the customer by email.'"
          >Invoice</NuiMenuItem
        >
        <NuiMenuItem @select="done = 'The payment link went out by text.'"
          >Payment link</NuiMenuItem
        >
      </NuiMenuSub>
      <NuiMenuSeparator />
      <NuiMenuLabel>Delivery</NuiMenuLabel>
      <NuiMenuRadioGroup v-model="delivery">
        <NuiMenuRadioItem v-for="method in methods" :key="method.value" :value="method.value">
          {{ method.label }}
        </NuiMenuRadioItem>
      </NuiMenuRadioGroup>
      <NuiMenuSeparator />
      <NuiMenuCheckboxItem v-model:checked="letters">Status emails</NuiMenuCheckboxItem>
      <NuiMenuSeparator />
      <NuiMenuItem icon="trash" tone="error" @select="done = 'Order 20408 is canceled.'">
        Cancel order
      </NuiMenuItem>
    </NuiMenu>
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Printer } from '@lucide/vue';
import {
  NuiButton,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
} from '@numior/vue';
import { DELIVERIES } from '#demo/orders';

const delivery = ref('courier');
const letters = ref(true);
const done = ref('');

const methods = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));

const summary = computed(() => {
  const method = methods.find((entry) => entry.value === delivery.value)?.label ?? '';
  const status = letters.value ? 'with status emails' : 'no status emails';

  return `${method}, ${status}. ${done.value}`.trim();
});
</script>
