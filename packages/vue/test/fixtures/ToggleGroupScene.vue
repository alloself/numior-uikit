<template>
  <div :dir="dir">
    <NuiToggleGroup v-bind="{ ...props, ...selection.props() }" :items="items" />
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { NuiToggleGroup, type NuiToggleGroupProps, type NuiToggleItem } from '../../src';
import type { Selection } from '../support/selection';

const {
  props = {},
  items,
  selection,
  dir = undefined,
} = defineProps<{
  props?: Omit<NuiToggleGroupProps<unknown>, 'items'> | undefined;
  items: readonly NuiToggleItem<unknown>[];
  selection: Selection;
  dir?: 'ltr' | 'rtl' | undefined;
}>();
</script>
