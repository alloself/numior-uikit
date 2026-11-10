<template>
  <li
    :id="id"
    class="nui-field-array__row"
    :class="{
      'nui-field-array__row--dragging': dragging,
      'nui-field-array__row--invalid': error !== undefined,
    }"
  >
    <span
      v-if="reorderable"
      class="nui-field-array__grip"
      :class="{ 'nui-field-array__grip--disabled': gripDisabled }"
    >
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="md"
        grip
        :aria-label="moveLabel"
        :disabled="gripDisabled"
        icon="grip"
        @pointerdown="emit('grab', $event)"
        @keydown="emit('grip-keydown', $event)"
        @blur="emit('grip-blur')"
      />
    </span>
    <div class="nui-field-array__content">
      <slot />
      <p v-if="error" class="nui-field-array__row-error">{{ error }}</p>
    </div>
    <slot name="actions">
      <span v-if="removable" class="nui-field-array__remove">
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="md"
          :aria-label="removeLabel"
          icon="trash"
          @click="emit('remove')"
        />
      </span>
    </slot>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiButton } from '@numior/vue';
import type { NuiFieldArrayRowProps } from './field-array.types';

const {
  id,
  path,
  form,
  dragging = false,
  reorderable = false,
  removable = false,
  gripDisabled = false,
  moveLabel,
  removeLabel,
} = defineProps<NuiFieldArrayRowProps>();

const emit = defineEmits<{
  grab: [event: PointerEvent];
  'grip-keydown': [event: KeyboardEvent];
  'grip-blur': [];
  remove: [];
}>();

form.register(() => path);

const error = computed(() => form.errorBag.value[path]?.[0]);
</script>
