<template>
  <div role="group" class="nui-menu-group">
    <slot />
  </div>
</template>

<script setup lang="ts" generic="T">
import { provideMenuRadio } from './menu-context';

const model = defineModel<T>();

provideMenuRadio<T>({
  modelValue: model,
  select: (value) => {
    model.value = value;
  },
});
</script>
