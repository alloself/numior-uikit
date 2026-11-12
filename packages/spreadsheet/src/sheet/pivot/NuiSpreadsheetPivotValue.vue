<template>
  <form ref="root" class="nui-spreadsheet-pivot__editor" novalidate @submit.prevent="save">
    <h3 class="nui-spreadsheet-pivot__subtitle">{{ fieldName }}</h3>
    <NuiInput
      :model-value="form.name"
      :label="texts.valueName"
      :error="nameText"
      size="sm"
      autocomplete="off"
      @update:model-value="setName"
    />
    <NuiSelect
      :model-value="form.aggregate"
      :options="aggregates"
      :label="texts.aggregate"
      size="sm"
      @update:model-value="setAggregate"
    />
    <NuiSelect
      :model-value="form.showAs"
      :options="showAsKinds"
      :label="texts.showAs"
      size="sm"
      @update:model-value="setShowAs"
    />
    <NuiSelect
      v-for="select in baseFields"
      :key="select"
      :model-value="form.base"
      :options="baseOptions"
      :label="texts.baseField"
      size="sm"
      @update:model-value="setBase"
    />
    <NuiSelect
      v-for="select in baseItems"
      :key="select"
      :model-value="form.item"
      :options="itemOptions"
      :label="texts.baseItem"
      size="sm"
      @update:model-value="setItem"
    />
    <NuiSelect
      :model-value="form.format"
      :options="formats"
      :label="texts.numberFormat"
      size="sm"
      @update:model-value="setFormat"
    />
    <div class="nui-spreadsheet-pivot__footer">
      <NuiButton variant="ghost" tone="neutral" size="sm" @click="emit('cancel')">
        {{ texts.cancel }}
      </NuiButton>
      <NuiButton type="submit" size="sm">{{ texts.apply }}</NuiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiInput, NuiSelect, type NuiOption } from '@numior/vue';
import { computed, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import {
  CellValueKind,
  PivotAggregate,
  PivotBaseStep,
  PivotShowAsKind,
  type PivotValue,
} from '../../core';
import { spreadsheetPivotMessages } from './pivot-panel.messages';
import { PivotNameError, type PivotItemView, type SheetPivotValueProps } from './pivot-panel.types';
import {
  PIVOT_FORMATS,
  baseItemKey,
  needsBaseField,
  needsBaseItem,
  pivotNameError,
  pivotValueForm,
  pivotValueOf,
  withAggregate,
} from './pivot-value-form';

const PERCENT_SAMPLE = 0.1234;

const NUMBER_SAMPLE = 1234.567;

const { value, fieldName, fields, bases, taken, items, format, language } =
  defineProps<SheetPivotValueProps>();

const emit = defineEmits<{
  apply: [value: PivotValue];
  cancel: [];
}>();

const root = useTemplateRef<HTMLFormElement>('root');

const texts = useMessages(spreadsheetPivotMessages);

const form = shallowRef(pivotValueForm(value, bases));

const tried = ref(false);

const aggregates = computed((): NuiOption<PivotAggregate>[] =>
  Object.values(PivotAggregate).map((aggregate) => ({
    value: aggregate,
    label: texts.value.aggregateName({ aggregate }),
  })),
);

const showAsKinds = computed((): NuiOption<PivotShowAsKind>[] =>
  Object.values(PivotShowAsKind).reduce<NuiOption<PivotShowAsKind>[]>((options, kind) => {
    if (bases.length > 0 || !needsBaseField(kind)) {
      options.push({ value: kind, label: texts.value.showAsName({ kind }) });
    }
    return options;
  }, []),
);

const baseFields = computed((): string[] => (needsBaseField(form.value.showAs) ? ['base'] : []));

const baseItems = computed((): string[] => (needsBaseItem(form.value.showAs) ? ['item'] : []));

const baseOptions = computed((): NuiOption<number>[] =>
  bases.map((field) => ({ value: field, label: fields[field]?.name ?? '' })),
);

const baseList = computed((): readonly PivotItemView[] => {
  const field = form.value.base;

  return field === undefined ? [] : (items(field) ?? []);
});

const itemOptions = computed((): NuiOption<string>[] => [
  { value: PivotBaseStep.Previous, label: texts.value.previousItem },
  { value: PivotBaseStep.Next, label: texts.value.nextItem },
  ...baseList.value.map((item) => ({ value: baseItemKey(item.value), label: item.label })),
]);

const sampleOf = (code: string): string =>
  format(
    { kind: CellValueKind.Number, value: code.endsWith('%') ? PERCENT_SAMPLE : NUMBER_SAMPLE },
    code,
  );

const formats = computed((): NuiOption<string>[] => {
  const codes =
    value.format === undefined || PIVOT_FORMATS.includes(value.format)
      ? PIVOT_FORMATS
      : [...PIVOT_FORMATS, value.format];

  return [
    { value: '', label: texts.value.formatGeneral },
    ...codes.map((code) => ({
      value: code,
      label: texts.value.formatName({ code, sample: sampleOf(code) }),
    })),
  ];
});

const nameError = computed(() => pivotNameError(form.value.name, taken));

const nameText = computed((): string | undefined => {
  const error = tried.value ? nameError.value : undefined;

  if (error === undefined) {
    return undefined;
  }
  return error === PivotNameError.Required ? texts.value.nameRequired : texts.value.nameTaken;
});

const setName = (name: string): void => {
  form.value = { ...form.value, name };
};

const setAggregate = (aggregate: PivotAggregate | null): void => {
  if (aggregate === null) {
    return;
  }

  form.value = withAggregate(form.value, aggregate, fieldName, language);
};

const setShowAs = (showAs: PivotShowAsKind | null): void => {
  if (showAs === null) {
    return;
  }

  form.value = { ...form.value, showAs };
};

const setBase = (base: number | null | undefined): void => {
  if (base === null || base === undefined) {
    return;
  }

  form.value = { ...form.value, base, item: PivotBaseStep.Previous };
};

const setItem = (item: string | null): void => {
  if (item === null) {
    return;
  }

  form.value = { ...form.value, item };
};

const setFormat = (code: string | null): void => {
  form.value = { ...form.value, format: code ?? '' };
};

const save = (): void => {
  tried.value = true;

  if (nameError.value === undefined) {
    emit('apply', pivotValueOf(value, form.value, baseList.value));
    return;
  }
  root.value?.querySelector('input')?.focus();
};

onMounted(() => {
  root.value?.querySelector('input')?.focus();
});
</script>
