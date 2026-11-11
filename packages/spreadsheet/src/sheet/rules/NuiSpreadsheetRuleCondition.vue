<template>
  <div v-if="form.kind === RuleFormKind.CellIs" class="nui-spreadsheet-rules__fields">
    <NuiSelect
      :model-value="form.operator"
      :options="operators"
      :label="texts.operator"
      size="sm"
      @update:model-value="setOperator"
    />
    <NuiInput
      :model-value="form.first"
      :label="texts.value"
      :error="errorOf(RuleField.First)"
      size="sm"
      @update:model-value="set('first', $event)"
    />
    <NuiInput
      v-for="field in secondFields"
      :key="field"
      :model-value="form.second"
      :label="texts.secondValue"
      :error="errorOf(RuleField.Second)"
      size="sm"
      @update:model-value="set('second', $event)"
    />
  </div>
  <NuiInput
    v-else-if="form.kind === RuleFormKind.Expression"
    :model-value="form.formula"
    :label="texts.formula"
    :error="errorOf(RuleField.Formula)"
    size="sm"
    spellcheck="false"
    @update:model-value="set('formula', $event)"
  />
  <div v-else-if="form.kind === RuleFormKind.Text" class="nui-spreadsheet-rules__fields">
    <NuiSelect
      :model-value="form.textOperator"
      :options="textOperators"
      :label="texts.operator"
      size="sm"
      @update:model-value="setTextOperator"
    />
    <NuiInput
      :model-value="form.text"
      :label="texts.text"
      :error="errorOf(RuleField.Text)"
      size="sm"
      @update:model-value="set('text', $event)"
    />
  </div>
  <NuiSelect
    v-else-if="form.kind === RuleFormKind.TimePeriod"
    :model-value="form.period"
    :options="periods"
    :label="texts.period"
    size="sm"
    @update:model-value="setPeriod"
  />
  <div v-else-if="form.kind === RuleFormKind.Top" class="nui-spreadsheet-rules__fields">
    <NuiSelect
      :model-value="form.bottom"
      :options="edges"
      :label="texts.edge"
      size="sm"
      @update:model-value="setEdge"
    />
    <NuiInput
      :model-value="form.rank"
      :label="texts.rank"
      :error="errorOf(RuleField.Rank)"
      inputmode="numeric"
      size="sm"
      @update:model-value="set('rank', $event)"
    />
    <NuiCheckbox
      :model-value="form.percent"
      :label="texts.percent"
      size="sm"
      @update:model-value="set('percent', $event)"
    />
  </div>
  <NuiSelect
    v-else-if="form.kind === RuleFormKind.AboveAverage"
    :model-value="form.average"
    :options="averages"
    :label="texts.operator"
    size="sm"
    @update:model-value="setAverage"
  />
</template>

<script setup lang="ts">
import { NuiCheckbox, NuiInput, NuiSelect, type NuiOption } from '@numior/vue';
import { computed } from 'vue';
import { useMessages } from '@numior/primitives';
import { CellIsOperator, TextOperator, TimePeriod } from '../../core/conditional/conditional.types';
import { spreadsheetRulesMessages } from './rules.messages';
import {
  AverageChoice,
  RuleField,
  RuleFormKind,
  type RuleEditorPartProps,
  type RuleForm,
} from './rules.types';

const { texts, error } = defineProps<RuleEditorPartProps>();

const form = defineModel<RuleForm>('form', { required: true });

const ruleTexts = useMessages(spreadsheetRulesMessages);

const operators = computed((): NuiOption<CellIsOperator>[] =>
  Object.values(CellIsOperator).map((operator) => ({
    value: operator,
    label: texts.operatorName({ operator }),
  })),
);

const textOperators = computed((): NuiOption<TextOperator>[] =>
  Object.values(TextOperator).map((operator) => ({
    value: operator,
    label: texts.textOperatorName({ operator }),
  })),
);

const periods = computed((): NuiOption<TimePeriod>[] =>
  Object.values(TimePeriod).map((period) => ({
    value: period,
    label: ruleTexts.value.period({ period }),
  })),
);

const edges = computed((): NuiOption<boolean>[] =>
  [false, true].map((bottom) => ({ value: bottom, label: texts.edgeName({ bottom }) })),
);

const averages = computed((): NuiOption<AverageChoice>[] =>
  Object.values(AverageChoice).map((choice) => ({
    value: choice,
    label: texts.averageName({ choice }),
  })),
);

const secondFields = computed((): string[] =>
  form.value.operator === CellIsOperator.Between ||
  form.value.operator === CellIsOperator.NotBetween
    ? ['second']
    : [],
);

const errorOf = (field: RuleField): string | undefined =>
  error === field ? texts.error({ field }) : undefined;

const set = <K extends keyof RuleForm>(key: K, value: RuleForm[K]): void => {
  form.value = { ...form.value, [key]: value };
};

const setOperator = (operator: CellIsOperator | null): void => {
  if (operator === null) {
    return;
  }

  set('operator', operator);
};

const setTextOperator = (operator: TextOperator | null): void => {
  if (operator === null) {
    return;
  }

  set('textOperator', operator);
};

const setPeriod = (period: TimePeriod | null): void => {
  if (period === null) {
    return;
  }

  set('period', period);
};

const setEdge = (bottom: boolean | null): void => {
  if (bottom === null) {
    return;
  }

  set('bottom', bottom);
};

const setAverage = (choice: AverageChoice | null): void => {
  if (choice === null) {
    return;
  }

  set('average', choice);
};
</script>
