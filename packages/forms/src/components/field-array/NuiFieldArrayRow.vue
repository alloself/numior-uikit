<template>
  <li
    :id="id"
    ref="root"
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
    <div
      class="nui-field-array__content"
      role="group"
      :aria-label="label"
      :aria-describedby="error === undefined ? undefined : errorId"
    >
      <slot />
      <p v-if="error" :id="errorId" class="nui-field-array__row-error">{{ error }}</p>
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
import { computed, useTemplateRef } from 'vue';
import { NuiButton } from '@numior/vue';
import { RowPart, type NuiFieldArrayRowProps } from './field-array.types';
import { focusRow } from './reorder-geometry';

const {
  id,
  path,
  form,
  dragging = false,
  reorderable = false,
  removable = false,
  gripDisabled = false,
  label,
  moveLabel,
  removeLabel,
} = defineProps<NuiFieldArrayRowProps>();

const emit = defineEmits<{
  grab: [event: PointerEvent];
  'grip-keydown': [event: KeyboardEvent];
  'grip-blur': [];
  remove: [];
}>();

const root = useTemplateRef<HTMLLIElement>('root');

form.register(() => path, {
  element: () => root.value,
  focus: () => {
    focusRow(root.value, RowPart.Control);
  },
});

const error = computed(() => form.errorBag.value[path]?.[0]);
const errorId = computed(() => `${id}-error`);
</script>
