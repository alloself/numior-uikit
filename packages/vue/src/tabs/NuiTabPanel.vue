<template>
  <div
    v-show="selected"
    :id="tabs.panelId(value)"
    role="tabpanel"
    class="nui-tab-panel"
    :aria-labelledby="tabs.tabId(value)"
    :tabindex="focusable ? 0 : undefined"
  >
    <slot v-if="rendered" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTabs } from './tabs-context';
import type { NuiTabPanelProps } from './tabs.types';

const { value, lazy = undefined, focusable = true } = defineProps<NuiTabPanelProps>();
const tabs = useTabs();
const selected = computed(() => tabs.modelValue.value === value);
const rendered = computed(() => !(lazy ?? tabs.lazy.value) || tabs.seen(value));
</script>
