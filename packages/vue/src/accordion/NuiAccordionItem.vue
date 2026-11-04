<template>
  <NuiCollapsible
    class="nui-accordion__item"
    :label="label"
    :variant="accordion.variant.value"
    :heading-level="accordion.headingLevel.value"
    :disabled="accordion.disabled.value || disabled"
    :open="accordion.isOpen(value)"
    @update:open="accordion.toggle(value, $event)"
  >
    <template v-if="$slots.trigger" #trigger="slot"><slot name="trigger" v-bind="slot" /></template>
    <slot />
  </NuiCollapsible>
</template>

<script setup lang="ts">
import NuiCollapsible from '../collapsible/NuiCollapsible.vue';
import { provideCollapsibleTrigger } from '../collapsible/collapsible-context';
import type { NuiCollapsibleTriggerSlot } from '../collapsible/collapsible.types';
import { useAccordion } from './accordion-context';
import type { NuiAccordionItemProps } from './accordion.types';

const { value, label, disabled = false } = defineProps<NuiAccordionItemProps>();

defineSlots<{ trigger?(props: NuiCollapsibleTriggerSlot): unknown; default?(): unknown }>();

const accordion = useAccordion();

provideCollapsibleTrigger((element) => accordion.triggers.ref(value)(element));
</script>
