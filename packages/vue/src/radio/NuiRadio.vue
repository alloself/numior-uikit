<script setup lang="ts" generic="T">
import { computed, useTemplateRef } from 'vue';
import { useControlId, useRadioGroup, useSplitAttrs } from '@numior/primitives';
import type { NuiRadioProps } from './radio.types';

defineOptions({ inheritAttrs: false });
const { value, id, disabled = undefined } = defineProps<NuiRadioProps<T>>();
const group = useRadioGroup();
const split = useSplitAttrs();
const controlId = useControlId(() => id);
const checked = computed(() => group !== null && group.modelValue.value === value);
const isDisabled = computed(() => disabled ?? group?.disabled.value ?? false);
const isInvalid = computed(() => group?.invalid.value ?? false);
const groupAttrs = computed(() =>
  group ? { name: group.name.value, checked: checked.value } : {},
);
const radioElement = useTemplateRef<HTMLInputElement>('radio');

function onChange(): void {
  if (radioElement.value?.checked) group?.select(value);
}
</script>

<template>
  <label
    class="nui-radio"
    :class="{
      'nui-radio--checked': checked,
      'nui-radio--invalid': isInvalid,
      'nui-radio--disabled': isDisabled,
    }"
    v-bind="split.rootAttrs()"
  >
    <input
      :id="controlId"
      ref="radio"
      type="radio"
      class="nui-radio__control"
      v-bind="{ ...split.controlAttrs(), ...groupAttrs }"
      :value="String(value)"
      :disabled="isDisabled"
      :aria-invalid="isInvalid ? 'true' : undefined"
      @change="onChange"
    />
    <span class="nui-radio__dot"></span>
    <span v-if="$slots.default" class="nui-radio__label">
      <slot />
    </span>
  </label>
</template>
