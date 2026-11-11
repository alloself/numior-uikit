<template>
  <div :id="attrs.id" :aria-describedby="attrs['aria-describedby']" role="group" class="flex gap-1">
    <NuiButton
      v-for="score in SCORES"
      :key="score"
      size="sm"
      :variant="score <= rating ? 'solid' : 'outline'"
      :tone="score <= rating ? 'primary' : 'neutral'"
      :aria-pressed="score <= rating"
      @click="rating = score"
    >
      {{ score }}
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { useFieldControl } from '@numior/primitives';
import { NuiButton } from '@numior/vue';

const SCORES = [1, 2, 3, 4, 5];

const rating = defineModel<number>({ required: true });

const { attrs } = useFieldControl(() => ({}), { group: true });
</script>
