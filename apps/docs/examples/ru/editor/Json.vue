<template>
  <div class="flex w-full flex-col gap-3">
    <NuiEditor
      v-model="document"
      format="json"
      label="Описание товара"
      placeholder="Расскажите о товаре"
    />
    <div class="flex items-center gap-3">
      <NuiButton @click="save">Сохранить</NuiButton>
      <span class="text-sm text-muted-foreground">{{ status }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { useDateFormat } from '@vueuse/core';
import type { DocJSON } from '@numior/editor-core';
import { NuiEditor } from '@numior/editor-vue';
import { NuiButton } from '@numior/vue';

const document = shallowRef<DocJSON>();
const saved = shallowRef<DocJSON>();
const savedAt = ref<Date>();

const time = useDateFormat(savedAt, 'HH:mm');

const status = computed(() => {
  if (savedAt.value === undefined) {
    return 'Описание ещё не сохранено';
  }
  return saved.value === document.value ? `Сохранено в ${time.value}` : 'Есть несохранённые правки';
});

const save = () => {
  saved.value = document.value;
  savedAt.value = new Date();
};
</script>
