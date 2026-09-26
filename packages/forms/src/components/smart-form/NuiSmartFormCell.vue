<template>
  <div class="nui-smart-form__cell" :style="{ '--_area': area }">
    <NuiFormField
      :name="path"
      :label="entry.label"
      :description="entry.description"
      :required="entry.required"
      :disabled="entry.disabled"
      :group="entry.group"
      :rules="rules"
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
import type { AsyncRuleContext, FieldRuleContext } from '../../core/types';
import { joinPath } from '../../paths/paths';
import { customAsync, isAsyncRule, type LooseFieldRule } from '../../rules/async-rule';
import { marked, originOf } from '../../rules/origin';
import { getAt } from '../../values/access';
import NuiFormField from '../form-field/NuiFormField.vue';
import type { NuiSmartFormCellProps } from './smart-form.types';
import { SmartSlot, useSmartSlots } from './smart-slots';

const { entry, scope, area } = defineProps<NuiSmartFormCellProps>();

const slots = useSmartSlots();

const path = computed(() => joinPath(scope.prefix, entry.name));
const slotName = computed(() => joinPath(scope.slotPrefix, entry.name));

const rowContext = (context: FieldRuleContext): FieldRuleContext => ({
  ...context,
  values: getAt(context.values, scope.prefix),
});

const rowAsyncContext = (context: AsyncRuleContext): AsyncRuleContext => ({
  ...context,
  values: getAt(context.values, scope.prefix),
});

const forRow = (rule: LooseFieldRule): LooseFieldRule =>
  isAsyncRule(rule)
    ? marked(
        customAsync(async (value, context) => {
          const result = await rule(value, rowAsyncContext(context));
          return result === true ? undefined : result;
        }),
        originOf(rule),
      )
    : marked<LooseFieldRule>(
        (value: unknown, context: FieldRuleContext): true | string =>
          rule(value, rowContext(context)),
        originOf(rule),
      );

const rules = computed(() =>
  scope.row === undefined ? entry.rules : entry.rules?.map((rule) => forRow(rule)),
);

const controlProps = computed(() =>
  typeof entry.props === 'function' ? entry.props(scope.values) : (entry.props ?? {}),
);
</script>
