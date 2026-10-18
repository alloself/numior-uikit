<template>
  <SplitAttrsControl
    class="wide"
    style="color: red"
    :placeholder="placeholder"
    aria-label="Name"
    @focus="emit('focus')"
  />
</template>

<script setup lang="ts">
import SplitAttrsControl from './SplitAttrsControl.vue';

const { placeholder } = defineProps<{
  placeholder: string;
}>();

const emit = defineEmits<{
  focus: [];
}>();
</script>
