<template>
  <div :dir="dir">
    <NuiTabs
      v-if="fromData"
      v-bind="{ ...props, ...selected }"
      :tabs="shown"
      label="Settings"
      @update:model-value="model = $event"
      @close="close"
    >
      <template #panel="{ tab }">{{ tab.label }} panel</template>
    </NuiTabs>
    <NuiTabs v-else v-bind="{ ...props, ...selected }" @update:model-value="model = $event">
      <NuiTabList label="Settings">
        <NuiTab
          v-for="tab in shown"
          :key="tab.value"
          :value="tab.value"
          :icon="tab.icon"
          :disabled="tab.disabled"
          :closable="tab.closable"
          @close="close(tab.value)"
        >
          {{ tab.label }}
        </NuiTab>
      </NuiTabList>
      <NuiTabPanel
        v-for="tab in shown"
        :key="tab.value"
        :value="tab.value"
        :lazy="lazyPanels.includes(tab.value) || undefined"
        :focusable="unfocusablePanels.includes(tab.value) ? false : undefined"
      >
        {{ tab.label }} panel
      </NuiTabPanel>
    </NuiTabs>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import {
  NuiTab,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
  type NuiTabDescriptor,
  type NuiTabsProps,
} from '../../src';

const {
  props = {},
  descriptors,
  initialValue = undefined,
  fromData = false,
  dir = 'ltr',
  lazyPanels = [],
  closable = [],
  unfocusablePanels = [],
} = defineProps<{
  props?: NuiTabsProps | undefined;
  descriptors: readonly NuiTabDescriptor[];
  initialValue?: string | undefined;
  fromData?: boolean | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
  lazyPanels?: readonly string[] | undefined;
  closable?: readonly string[] | undefined;
  unfocusablePanels?: readonly string[] | undefined;
}>();

const model = ref(initialValue);
const closed: string[] = [];

const shown = shallowRef(
  descriptors.map((tab) => ({ ...tab, closable: closable.includes(tab.value) })),
);

const selected = computed(() => (model.value === undefined ? {} : { modelValue: model.value }));

const close = (value: string): void => {
  const index = shown.value.findIndex((tab) => tab.value === value);

  closed.push(value);
  shown.value = shown.value.filter((tab) => tab.value !== value);

  if (model.value === value) {
    model.value = (shown.value[index] ?? shown.value[index - 1])?.value;
  }
};

defineExpose({ model, closed });
</script>
