<template>
  <div class="nui-smart-form__cell" :style="{ '--_area': area }">
    <NuiFormField
      :form="form"
      :name="entry.name"
      :label="entry.label"
      :description="entry.description"
      :required="entry.required"
      :disabled="entry.disabled"
      :readonly="entry.readonly"
      :group="entry.group"
      :rules="entry.rules"
      :validate-on="entry.validateOn"
      :keep-value="entry.keepValue"
    >
      <template #default="{ field, error, invalid, touched, pending }">
        <component :is="entry.component" v-bind="{ ...controlProps, ...bindModel(field) }">
          <template v-if="$slots[slotName]" #default>
            <slot :name="slotName" v-bind="{ error, invalid, touched, pending, row }" />
          </template>
        </component>
      </template>
    </NuiFormField>
    <slot :name="`${slotName}:after`" :row="row" />
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { computed } from 'vue';
import { FORM_HOST } from '../../form/form-context';
import type { FieldScopeBinding } from '../form-field/form-field.types';
import NuiFormField from '../form-field/NuiFormField.vue';
import { slotNameOf } from './items';
import type { NuiSmartFormPartSlots, NuiSmartFormCellProps } from './smart-form.types';

const { form, entry, path, area, row } = defineProps<NuiSmartFormCellProps<T>>();

defineSlots<NuiSmartFormPartSlots>();
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
