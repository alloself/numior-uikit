<template>
  <label
    class="nui-radio"
    :class="{
      'nui-radio--checked': checked,
      'nui-radio--invalid': isInvalid,
      'nui-radio--disabled': isDisabled,
      'nui-radio--readonly': isReadonly,
    }"
    v-bind="split.rootAttrs()"
  >
    <input
      :id="controlId"
      ref="radio"
      type="radio"
      class="nui-radio__control"
      v-bind="{ ...split.controlAttrs(), ...groupAttrs }"
      :value="key"
      :disabled="isDisabled"
      :aria-invalid="isInvalid ? 'true' : undefined"
      @click="onClick"
      @change="onChange"
    />
    <span class="nui-radio__dot"></span>
    <span v-if="$slots.default" class="nui-radio__label">
      <slot />
    </span>
  </label>
</template>

<script setup lang="ts" generic="T">
import { computed, useTemplateRef } from 'vue';
import { useControlId, useRadioGroup, useSplitAttrs } from '@numior/primitives';
import { defaultOptionKey } from '../shared/options';
import type { NuiRadioProps } from './radio.types';

defineOptions({ inheritAttrs: false });
const { value, id, disabled = undefined } = defineProps<NuiRadioProps<T>>();
const group = useRadioGroup();
const split = useSplitAttrs();
const controlId = useControlId(() => id);
const key = computed(() => (group ? group.keyOf(value) : defaultOptionKey(value)));
const checked = computed(() => group !== null && group.selectedKey.value === key.value);
const isDisabled = computed(() => disabled ?? group?.disabled.value ?? false);
const isInvalid = computed(() => group?.invalid.value ?? false);
const isReadonly = computed(() => group?.readonly.value ?? false);

const groupAttrs = computed(() =>
  group ? { name: group.name.value, checked: checked.value } : {},
);

const radioElement = useTemplateRef<HTMLInputElement>('radio');

const onClick = (event: MouseEvent): void => {
  if (isReadonly.value) {
    event.preventDefault();
  }
};

const onChange = (): void => {
  if (radioElement.value?.checked) {
    group?.select(value);
  }
};
</script>
