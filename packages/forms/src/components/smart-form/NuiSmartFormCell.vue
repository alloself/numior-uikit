<template>
  <div class="nui-smart-form__cell" :style="{ '--_area': area }">
    <NuiFormField
      :name="path"
      :label="entry.label"
      :description="entry.description"
      :required="entry.required"
      :disabled="entry.disabled"
      :group="entry.group"
      :rules="entry.rules"
      :validate-on="entry.validateOn"
      :keep-value="entry.keepValue"
    >
      <template #default="field">
        <SmartSlot :render="slots[slotName]" :scope="{ ...field, row: scope.row }">
          <component :is="entry.component" v-bind="{ ...controlProps, ...field.field }" />
        </SmartSlot>
      </template>
    </NuiFormField>
    <SmartSlot :render="slots[`${slotName}:after`]" :scope="{ row: scope.row }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { joinPath } from '../../paths/paths';
import NuiFormField from '../form-field/NuiFormField.vue';
import type { NuiSmartFormCellProps } from './smart-form.types';
import { SmartSlot, useSmartSlots } from './smart-slots';

const { entry, scope, area } = defineProps<NuiSmartFormCellProps>();

const slots = useSmartSlots();

const path = computed(() => joinPath(scope.prefix, entry.name));
const slotName = computed(() => joinPath(scope.slotPrefix, entry.name));

const controlProps = computed(() =>
  typeof entry.props === 'function' ? entry.props(scope.values) : (entry.props ?? {}),
);
</script>
