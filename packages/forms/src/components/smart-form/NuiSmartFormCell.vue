<template>
  <div class="nui-smart-form__cell" :style="{ '--_area': area }">
    <NuiFormField
      :form="form"
      :name="entry.name"
      :label="entry.label"
      :description="entry.description"
      :required="entry.required"
      :disabled="entry.disabled"
      :group="entry.group"
      :rules="entry.rules"
      :validate-on="entry.validateOn"
      :keep-value="entry.keepValue"
    >
      <template #default="{ field, error, invalid, touched, pending }">
        <component :is="entry.component" v-bind="{ ...controlProps, ...bindModel(field) }">
          <template v-if="slots[slotName]" #default>
            <SmartSlot
              :render="slots[slotName]"
              :scope="{ error, invalid, touched, pending, row }"
            />
          </template>
        </component>
      </template>
    </NuiFormField>
    <SmartSlot :render="slots[`${slotName}:after`]" :scope="{ row }" />
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { computed } from 'vue';
import { FORM_HOST } from '../../form/form-context';
import type { FieldScopeBinding } from '../form-field/form-field.types';
import NuiFormField from '../form-field/NuiFormField.vue';
import { slotNameOf } from './items';
import type { NuiSmartFormCellProps } from './smart-form.types';
import { SmartSlot, useSmartSlots } from './smart-slots';

const { form, entry, path, area, row } = defineProps<NuiSmartFormCellProps<T>>();

const slots = useSmartSlots();
const { values } = form[FORM_HOST].engine;

const slotName = computed(() => slotNameOf(path));

const controlProps = computed(() =>
  typeof entry.props === 'function' ? entry.props(values) : (entry.props ?? {}),
);

const bindModel = (field: FieldScopeBinding<unknown>): Record<string, unknown> => {
  const model = entry.model ?? 'modelValue';

  return {
    name: field.name,
    [model]: field.modelValue,
    [`onUpdate:${model}`]: field['onUpdate:modelValue'],
  };
};
</script>
