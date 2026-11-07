<template>
  <form ref="root" class="nui-spreadsheet-rules__editor" novalidate @submit.prevent="emit('save')">
    <h3 class="nui-spreadsheet-rules__subtitle">{{ title }}</h3>
    <NuiInput
      :model-value="form.area"
      :label="texts.applyTo"
      :error="areaError"
      size="sm"
      spellcheck="false"
      autocomplete="off"
      @update:model-value="setArea"
    />
    <NuiSelect
      :model-value="form.kind"
      :options="kinds"
      :label="texts.ruleKind"
      size="sm"
      @update:model-value="setKind"
    />
    <NuiSpreadsheetRuleCondition v-model:form="form" :texts="texts" :looks="looks" :error="error" />
    <NuiSpreadsheetRuleLook v-if="styled" v-model:form="form" :texts="texts" :looks="looks" />
    <NuiSpreadsheetRuleMarks v-else v-model:form="form" :texts="texts" :looks="looks" />
    <NuiCheckbox
      v-for="field in stopFields"
      :key="field"
      :model-value="form.stopIfTrue"
      :label="texts.stopIfTrue"
      size="sm"
      @update:model-value="setStop"
    />
    <div class="nui-spreadsheet-rules__footer">
      <NuiButton variant="ghost" tone="neutral" size="sm" @click="emit('cancel')">
        {{ texts.cancel }}
      </NuiButton>
      <NuiButton type="submit" size="sm">{{ texts.save }}</NuiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { NuiButton, NuiCheckbox, NuiInput, NuiSelect, type NuiOption } from '@numior/vue';
import { computed, onMounted, useTemplateRef } from 'vue';
import NuiSpreadsheetRuleCondition from './NuiSpreadsheetRuleCondition.vue';
import NuiSpreadsheetRuleLook from './NuiSpreadsheetRuleLook.vue';
import NuiSpreadsheetRuleMarks from './NuiSpreadsheetRuleMarks.vue';
import { styledForm, withKind } from './rule-form';
import { RuleField, RuleFormKind, type RuleForm, type SheetRuleEditorProps } from './rules.types';

const { texts, looks, error, title } = defineProps<SheetRuleEditorProps>();

const form = defineModel<RuleForm>('form', { required: true });

const emit = defineEmits<{
  save: [];
  cancel: [];
}>();

const root = useTemplateRef<HTMLFormElement>('root');

const kinds = computed((): NuiOption<RuleFormKind>[] =>
  Object.values(RuleFormKind).map((kind) => ({ value: kind, label: texts.kind({ kind }) })),
);

const styled = computed(() => styledForm(form.value.kind));

const stopFields = computed((): string[] => (styled.value ? ['stopIfTrue'] : []));

const areaError = computed(() =>
  error === RuleField.Area ? texts.error({ field: RuleField.Area }) : undefined,
);

const setArea = (area: string): void => {
  form.value = { ...form.value, area };
};

const setKind = (kind: RuleFormKind | null): void => {
  if (kind !== null) {
    form.value = withKind(form.value, kind);
  }
};

const setStop = (stopIfTrue: boolean): void => {
  form.value = { ...form.value, stopIfTrue };
};

const focusFirst = (): void => {
  const field = root.value?.querySelector('input');

  field?.focus();
};

const focusInvalid = (): void => {
  const field = root.value?.querySelector('[aria-invalid="true"]');

  if (field instanceof HTMLElement) {
    field.focus();
  }
};

onMounted(focusFirst);

defineExpose({ focusInvalid });
</script>
