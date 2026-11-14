<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiTree
      v-model:values="checked"
      v-model:expanded="expanded"
      :items="categories"
      checkable
      variant="outline"
      label="Категории для скидки"
      class="w-full"
    />
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiTree } from '@numior/vue';
import { categories } from '#demo/products';

const leaves = categories.flatMap((category) => category.children ?? []);
const list = new Intl.ListFormat('ru', { type: 'conjunction' });

const checked = ref(['throws']);
const expanded = ref(['textile']);

const chosen = computed(() =>
  leaves.reduce<string[]>((labels, leaf) => {
    if (checked.value.includes(leaf.value)) {
      labels.push(`«${leaf.label}»`);
    }
    return labels;
  }, []),
);

const summary = computed(() => {
  if (chosen.value.length === 0) {
    return 'Выберите категории, на которые действует скидка.';
  }

  const where = chosen.value.length === 1 ? 'в категории' : 'в категориях';

  return `Скидка действует ${where} ${list.format(chosen.value)}.`;
});
</script>
