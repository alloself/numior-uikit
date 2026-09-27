<template>
  <TransitionGroup
    ref="grid"
    tag="div"
    class="nui-smart-form__grid"
    :class="gridClass"
    :style="gridStyle"
    enter-from-class="nui-smart-form__cell--appearing"
    enter-active-class="nui-smart-form__cell--entering"
    leave-active-class="nui-smart-form__cell--leaving"
    leave-to-class="nui-smart-form__cell--appearing"
    move-class="nui-smart-form__cell--moving"
    @before-leave="pinLeaving"
  >
    <template v-for="item in ordered" :key="item.key">
      <NuiSmartFormCell
        v-if="item.kind === 'field'"
        :form="form"
        :entry="item.entry"
        :path="item.path"
        :area="areaFor(item)"
        :row="row"
      />
      <fieldset
        v-else-if="item.kind === 'section'"
        class="nui-smart-form__cell nui-smart-form__section"
        :style="cellStyle(item)"
      >
        <legend class="nui-smart-form__legend">{{ item.entry.title }}</legend>
        <p v-if="item.entry.description" class="nui-smart-form__section-description">
          {{ item.entry.description }}
        </p>
        <NuiSmartFormEntries
          :form="form"
          :entries="item.entry.fields"
          :layout="item.entry.layout"
          :prefix="prefix"
          :row="row"
        />
      </fieldset>
      <div v-else class="nui-smart-form__cell" :style="cellStyle(item)">
        <NuiFieldArray
          :form="form"
          :name="item.entry.name"
          :label="item.entry.label"
          :description="item.entry.description"
          :min="item.entry.min"
          :max="item.entry.max"
          :reorderable="item.entry.reorderable"
          :new-row="item.entry.newRow"
          :add-label="item.entry.addLabel"
          :remove-label="item.entry.removeLabel"
          :move-label="item.entry.moveLabel"
        >
          <template #default="{ row: current }">
            <NuiSmartFormEntries
              :form="form"
              :array="item.entry"
              :layout="item.entry.layout"
              :prefix="current.path"
              :row="current"
            />
          </template>
        </NuiFieldArray>
      </div>
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts" generic="T extends object">
import { computed, useTemplateRef } from 'vue';
import { useBlockSizeTween } from '@numior/primitives';
import { FORM_HOST } from '../../form/form-context';
import NuiFieldArray from '../field-array/NuiFieldArray.vue';
import NuiSmartFormCell from './NuiSmartFormCell.vue';
import { declareEntries, isShown } from './declarations';
import { itemOf, type SmartItem } from './items';
import { orderByArea, planLayout } from './layout';
import type { NuiSmartFormEntriesProps } from './smart-form.types';

const {
  form,
  entries,
  array,
  layout,
  prefix = '',
  row,
} = defineProps<NuiSmartFormEntriesProps<T>>();

const { raw, values } = form[FORM_HOST].engine;

const list = computed(() => (array === undefined ? (entries ?? []) : array.rows(() => row)));
const items = computed(() => list.value.map((entry) => itemOf(raw, entry, prefix)));
const shown = computed(() => items.value.filter((item) => isShown(item.entry, values)));
const plan = computed(() => planLayout(layout, new Set(shown.value.map((item) => item.area))));
const ordered = computed(() => orderByArea(shown.value, plan.value.order));
const planned = computed(() => new Set(plan.value.order));

const gridClass = computed(() => ({
  'nui-smart-form__grid--layout': plan.value.areas !== undefined,
}));

const gridStyle = computed(() =>
  plan.value.areas === undefined
    ? undefined
    : { '--_areas': plan.value.areas, '--_layout-columns': String(plan.value.columns) },
);

const areaFor = (item: SmartItem<T>): string => (planned.value.has(item.area) ? item.area : 'auto');

const cellStyle = (item: SmartItem<T>) => ({ '--_area': areaFor(item) });

const grid = useTemplateRef<{ $el: unknown }>('grid');

const gridElement = (): HTMLElement | null => {
  const element = grid.value?.$el;
  return element instanceof HTMLElement ? element : null;
};

const pinLeaving = (element: Element): void => {
  if (element instanceof HTMLElement) {
    element.inert = true;
    element.style.top = `${element.offsetTop}px`;
    element.style.left = `${element.offsetLeft}px`;
    element.style.inlineSize = `${element.offsetWidth}px`;
  }
};

useBlockSizeTween(gridElement);

if (array !== undefined) {
  declareEntries(form, list.value);
}
</script>
