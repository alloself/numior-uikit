<template>
  <NuiField label="Rating" description="From 1 to 5" class="nui-max-w-sm">
    <Rating />
    <p class="nui-m-0 nui-text-sm nui-text-muted">Rating: {{ rating }} of 5</p>
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
          class: 'nui-flex nui-gap-1',
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
