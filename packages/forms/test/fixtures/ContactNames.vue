<template>
  <ol>
    <li v-for="row in rows" :key="row.key">{{ row.value.name }}</li>
  </ol>
</template>

<script setup lang="ts">
import { useFieldArray, useForm } from '../../src';
import type { Contacts } from './scenes.types';

const form = useForm<Contacts>({
  initialValues: { contacts: [{ name: 'Ann' }, { name: 'Bob' }] },
  onSubmit: () => undefined,
});

const { fields: rows } = useFieldArray((values: Contacts) => values.contacts, { form });
</script>
