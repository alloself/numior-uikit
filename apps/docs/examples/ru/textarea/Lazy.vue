<template>
  <NuiTextarea
    v-model.lazy.trim="note"
    label="Заметка для склада"
    :description="description"
    :rows="3"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiTextarea } from '@numior/kit';

const note = ref('');

const description = computed(() =>
  note.value === '' ? 'Заметки в заказе пока нет' : 'Заметка сохранена, склад её увидит',
);
</script>
