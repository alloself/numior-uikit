<template>
  <div
    :id="id"
    ref="root"
    class="nui-accordion"
    :class="[`nui-accordion--variant-${variant}`, { 'nui-accordion--disabled': disabled }]"
    @keydown="onKeydown"
    @focusin="navigation.onFocusin"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { createCollection, useListNavigation } from '@numior/primitives';
import { provideAccordion } from './accordion-context';
import type { NuiAccordionProps } from './accordion.types';
import { NuiCollapsibleVariant } from '../collapsible/collapsible.types';

const {
  id,
  multiple = false,
  collapsible = true,
  variant = NuiCollapsibleVariant.Plain,
  headingLevel,
  disabled = false,
} = defineProps<NuiAccordionProps>();

const model = defineModel<string | null>({ default: null });
const values = defineModel<string[]>('values', { default: () => [] });

defineSlots<{ default?(): unknown }>();

const root = useTemplateRef<HTMLElement>('root');

const openValues = computed(() =>
  multiple ? new Set(values.value) : new Set(model.value === null ? [] : [model.value]),
);

const triggers = createCollection<string>();

const navigation = useListNavigation(root, {
  items: triggers.elements,
  orientation: 'vertical',
  loop: true,
  typeahead: false,
});

const onKeydown = (event: KeyboardEvent): void => {
  if (navigation.itemFrom(event.target) !== null) {
    navigation.onKeydown(event);
  }
};

const toggleMany = (value: string, open: boolean): void => {
  const others = values.value.filter((item) => item !== value);

  values.value = open ? [...others, value] : others;
};

const toggleOne = (value: string, open: boolean): void => {
  if (open) {
    model.value = value;
  } else if (collapsible) {
    model.value = null;
  }
};

provideAccordion({
  triggers,
  variant: computed(() => variant),
  headingLevel: computed(() => headingLevel),
  disabled: computed(() => disabled),
  isOpen: (value) => openValues.value.has(value),
  toggle: (value, open) => (multiple ? toggleMany(value, open) : toggleOne(value, open)),
});
</script>
