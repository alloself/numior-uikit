<template>
  <section>
    <ol>
      <ArrayRowProbe
        v-for="row in rows"
        :key="row.key"
        :form="form"
        :row="row"
        :rules="rowRules"
        :probes="probes"
      />
    </ol>
    <p v-if="listError !== undefined" id="list-error">{{ listError }}</p>
  </section>
</template>

<script setup lang="ts">
import { useFieldArray, useForm, type AnyFieldRule, type SubmittedValues } from '../../src';
import ArrayRowProbe from './ArrayRowProbe.vue';
import type { Contact, RowProbes, Team } from './scenes.types';

const {
  initialValues,
  listRules = [],
  rowRules,
  active = true,
} = defineProps<{
  initialValues: Team;
  listRules?: readonly AnyFieldRule<readonly Contact[], Team>[] | undefined;
  rowRules?: readonly AnyFieldRule<string | undefined, Team>[] | undefined;
  active?: boolean | undefined;
}>();

const submissions: SubmittedValues<Team>[] = [];
const probes: RowProbes = { rows: new Map(), work: new Map() };

const form = useForm<Team>({
  initialValues,
  onSubmit: (values) => {
    submissions.push(values);
  },
});

const list = useFieldArray((values: Team) => values.contacts, {
  form,
  rules: listRules,
  active: () => active,
});

const { fields: rows, errorMessage: listError } = list;

defineExpose({ form, list, probes, submissions });
</script>
