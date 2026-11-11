<template>
  <component
    :is="links ? 'nav' : 'div'"
    class="nui-tabs"
    :class="[
      `nui-tabs--orientation-${orientation}`,
      `nui-tabs--variant-${variant}`,
      `nui-tabs--size-${size}`,
    ]"
    :aria-label="links ? label : undefined"
  >
    <NuiTabList v-if="links">
      <NuiTabLink
        v-for="link in links"
        :key="getKey(link.to)"
        :link="link"
        :link-key="getKey(link.to)"
        :as="as"
      />
    </NuiTabList>
    <NuiTabList v-else-if="tabs" :label="label">
      <NuiTab
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        :icon="tab.icon"
        :disabled="tab.disabled"
        :closable="tab.closable"
        @close="emit('close', tab.value)"
      >
        {{ tab.label }}
      </NuiTab>
    </NuiTabList>
    <slot />
    <template v-if="tabs && $slots.panel">
      <NuiTabPanel v-for="tab in tabs" :key="tab.value" :value="tab.value">
        <slot name="panel" :tab="tab" />
      </NuiTabPanel>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed, shallowReactive, watch } from 'vue';
import { useControlId } from '@numior/primitives';
import NuiTab from './NuiTab.vue';
import NuiTabLink from './NuiTabLink.vue';
import NuiTabList from './NuiTabList.vue';
import NuiTabPanel from './NuiTabPanel.vue';
import { provideTabs } from './tabs-context';
import {
  NuiTabsActivation,
  NuiTabsOrientation,
  NuiTabsVariant,
  type NuiTabsPanelSlot,
  type NuiTabsProps,
} from './tabs.types';
import { defaultOptionKey } from '../shared/options';
import { NuiSize } from '../shared/scale.types';

const {
  id,
  activation = NuiTabsActivation.Automatic,
  orientation = NuiTabsOrientation.Horizontal,
  variant = NuiTabsVariant.Line,
  size = NuiSize.Md,
  lazy = false,
  tabs,
  links,
  getKey = defaultOptionKey,
  as,
  label,
} = defineProps<NuiTabsProps>();

const model = defineModel<string>();
const emit = defineEmits<{ close: [value: string] }>();
const slots = defineSlots<{ default(): unknown; panel?(props: NuiTabsPanelSlot): unknown }>();

const baseId = useControlId(() => id);
const visited = shallowReactive(new Set<string>());

watch(
  () => model.value,
  (value) => {
    if (value === undefined) {
      return;
    }

    visited.add(value);
  },
  { immediate: true },
);

provideTabs({
  modelValue: model,
  activation: computed(() => activation),
  orientation: computed(() => orientation),
  lazy: computed(() => lazy),
  navigation: computed(() => links !== undefined),
  select: (value) => {
    visited.add(value);
    model.value = value;
  },
  seen: (value) => visited.has(value),
  tabId: (value) => `${baseId.value}-tab-${encodeURIComponent(value)}`,
  panelId: (value) => `${baseId.value}-panel-${encodeURIComponent(value)}`,
  panels: computed(() => tabs === undefined || slots.panel !== undefined),
});
</script>
