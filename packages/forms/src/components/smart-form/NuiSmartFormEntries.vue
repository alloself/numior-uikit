<template>
  <TransitionGroup
    tag="div"
    class="nui-smart-form__grid"
    :class="gridClass"
    :style="gridStyle"
    enter-from-class="nui-smart-form__cell--appearing"
    enter-active-class="nui-smart-form__cell--entering"
  >
    <template v-for="entry in ordered" :key="keyOf(entry)">
      <NuiSmartFormCell
        v-if="entry.kind === 'field'"
        :entry="entry"
        :scope="scope"
        :area="areaFor(entry)"
      />
      <fieldset
        v-else-if="entry.kind === 'section'"
        class="nui-smart-form__cell nui-smart-form__section"
        :style="cellStyle(entry)"
      >
        <legend class="nui-smart-form__legend">{{ entry.title }}</legend>
        <p v-if="entry.description" class="nui-smart-form__section-description">
          {{ entry.description }}
        </p>
        <NuiSmartFormEntries :entries="entry.fields" :scope="scope" :layout="entry.layout" />
      </fieldset>
      <div v-else class="nui-smart-form__cell" :style="cellStyle(entry)">
        <NuiFieldArray
          :name="pathOf(entry)"
          :label="entry.label"
          :description="entry.description"
          :min="entry.min"
          :max="entry.max"
          :reorderable="entry.reorderable"
          :new-row="entry.newRow"
          :add-label="entry.addLabel"
          :remove-label="entry.removeLabel"
          :move-label="entry.moveLabel"
        >
          <template #default="{ row }">
            <NuiSmartFormEntries
              :entries="entry.fields"
              :scope="rowScope(entry, row)"
              :layout="entry.layout"
              declares
            />
          </template>
        </NuiFieldArray>
      </div>
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFormContext } from '../../form/form-context';
import { joinPath } from '../../paths/paths';
import NuiFieldArray from '../field-array/NuiFieldArray.vue';
import NuiSmartFormCell from './NuiSmartFormCell.vue';
import { declareEntries, isShown } from './declarations';
import { areaOf, orderEntries, planLayout } from './layout';
import type {
  NuiSmartFormArray,
  NuiSmartFormEntriesProps,
  NuiSmartFormEntry,
  SmartRow,
  SmartScope,
} from './smart-form.types';

const { entries, scope, layout, declares = false } = defineProps<NuiSmartFormEntriesProps>();

const form = useFormContext();

if (declares && form) {
  declareEntries(form, entries, () => scope);
}

const shown = computed(() => entries.filter((entry) => isShown(entry, scope)));
const plan = computed(() => planLayout(layout, new Set(shown.value.map(areaOf))));
const ordered = computed(() => orderEntries(shown.value, plan.value.order));
const planned = computed(() => new Set(plan.value.order));

const gridClass = computed(() => ({
  'nui-smart-form__grid--layout': plan.value.areas !== undefined,
}));

const gridStyle = computed(() =>
  plan.value.areas === undefined
    ? undefined
    : { '--_areas': plan.value.areas, '--_layout-columns': String(plan.value.columns) },
);

const keyOf = (entry: NuiSmartFormEntry): string =>
  `${entry.kind}:${entry.name ?? (entry.kind === 'section' ? entry.title : '')}`;

const areaFor = (entry: NuiSmartFormEntry): string => {
  const area = areaOf(entry);
  return planned.value.has(area) ? area : 'auto';
};

const cellStyle = (entry: NuiSmartFormEntry) => ({ '--_area': areaFor(entry) });

const pathOf = (entry: NuiSmartFormArray): string => joinPath(scope.prefix, entry.name);

const rowScope = (entry: NuiSmartFormArray, row: SmartRow): SmartScope => ({
  values: row.value,
  prefix: row.path,
  slotPrefix: joinPath(scope.slotPrefix, entry.name),
  row,
});
</script>
