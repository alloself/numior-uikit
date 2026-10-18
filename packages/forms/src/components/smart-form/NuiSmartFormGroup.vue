<template>
  <fieldset
    v-if="item.kind === 'section'"
    class="nui-smart-form__cell nui-smart-form__section"
    :style="cellStyle"
  >
    <legend class="nui-smart-form__legend">{{ item.entry.title }}</legend>
    <p v-if="item.entry.description" class="nui-smart-form__section-description">
      {{ item.entry.description }}
    </p>
    <slot
      name="content"
      :entries="item.entry.fields"
      :layout="item.entry.layout"
      :prefix="prefix"
      :row="row"
    />
  </fieldset>
  <div v-else class="nui-smart-form__cell" :style="cellStyle">
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
        <slot
          name="content"
          :array="item.entry"
          :layout="item.entry.layout"
          :prefix="current.path"
          :row="current"
        />
      </template>
    </NuiFieldArray>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { computed } from 'vue';
import NuiFieldArray from '../field-array/NuiFieldArray.vue';
import type { NuiSmartFormGroupProps, NuiSmartFormGroupSlots } from './smart-form.types';

const { form, item, area, prefix = '', row } = defineProps<NuiSmartFormGroupProps<T>>();

defineSlots<NuiSmartFormGroupSlots<T>>();

const cellStyle = computed(() => ({ '--_area': area }));
</script>
