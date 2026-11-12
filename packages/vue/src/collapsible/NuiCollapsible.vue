<template>
  <div
    class="nui-collapsible"
    :class="[
      `nui-collapsible--variant-${variant}`,
      { 'nui-collapsible--open': open, 'nui-collapsible--disabled': disabled },
    ]"
  >
    <component :is="headingTag" class="nui-collapsible__heading">
      <button
        :ref="registerTrigger"
        type="button"
        class="nui-collapsible__trigger"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="contentId"
        :disabled="disabled"
        @click="open = !open"
      >
        <span class="nui-collapsible__label"
          ><slot name="trigger" :open="open">{{ label }}</slot></span
        >
        <NuiIcon icon="chevron-down" class="nui-collapsible__chevron" />
      </button>
    </component>
    <div class="nui-collapsible__panel" @transitionend="settle">
      <div
        :id="contentId"
        class="nui-collapsible__content"
        :hidden.attr="hiddenState"
        @beforematch="open = true"
      >
        <div class="nui-collapsible__body"><slot /></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useControlId } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import { provideCollapsibleTrigger, useCollapsibleTrigger } from './collapsible-context';
import {
  NuiCollapsibleVariant,
  type NuiCollapsibleProps,
  type NuiCollapsibleTriggerSlot,
} from './collapsible.types';

const ROW_TRACKS = 'grid-template-rows';

const {
  id,
  label,
  variant = NuiCollapsibleVariant.Plain,
  headingLevel,
  disabled = false,
} = defineProps<NuiCollapsibleProps>();

const open = defineModel<boolean>('open', { default: false });

defineSlots<{ trigger?(props: NuiCollapsibleTriggerSlot): unknown; default?(): unknown }>();

const registerTrigger = useCollapsibleTrigger();

provideCollapsibleTrigger(null);

const baseId = useControlId(() => id);
const contentId = computed(() => `${baseId.value}-content`);
const headingTag = computed(() => (headingLevel === undefined ? 'div' : `h${headingLevel}`));
const settled = ref(!open.value);

const hiddenState = computed(() => (!open.value && settled.value ? 'until-found' : undefined));

const settle = (event: TransitionEvent): void => {
  if (event.propertyName !== ROW_TRACKS || open.value) {
    return;
  }

  settled.value = true;
};

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  settled.value = false;
});
</script>
