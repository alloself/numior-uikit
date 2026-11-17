<template>
  <NuiTextarea
    v-model.lazy.trim="note"
    label="Note for the warehouse"
    :description="description"
    :rows="3"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiTextarea } from '@numior/kit';

const note = ref('');

const description = computed(() =>
  note.value === '' ? 'The order has no note yet' : 'Note saved, the warehouse will see it',
);
</script>
