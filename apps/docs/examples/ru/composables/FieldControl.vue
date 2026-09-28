<template>
  <NuiField label="Оценка" description="От 1 до 5" class="max-w-sm">
    <Rating />
    <p class="m-0 text-sm text-muted-foreground">Оценка: {{ rating }} из 5</p>
  </NuiField>
</template>

<script setup lang="ts">
import { defineComponent, h, ref } from 'vue';
import { NuiButton, NuiField, useFieldControl } from '@numior/vue';

const rating = ref(4);
const scores = [1, 2, 3, 4, 5];

const Rating = defineComponent({
  setup: () => {
    const control = useFieldControl(() => ({}), { group: true });

    return () =>
      h(
        'div',
        {
          id: control.attrs.value.id,
          'aria-describedby': control.attrs.value['aria-describedby'],
          role: 'group',
          class: 'flex gap-1',
        },
        scores.map((score) =>
          h(
            NuiButton,
            {
              size: 'sm',
              variant: score <= rating.value ? 'solid' : 'outline',
              tone: score <= rating.value ? 'primary' : 'neutral',
              'aria-pressed': score <= rating.value,
              onClick: () => (rating.value = score),
            },
            () => String(score),
          ),
        ),
      );
  },
});
</script>
