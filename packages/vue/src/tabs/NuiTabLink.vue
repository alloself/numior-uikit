<template>
  <component
    :is="disabled ? 'a' : tag"
    :ref="list.tabs.ref(linkKey)"
    class="nui-tab"
    :class="{ 'nui-tab--selected': selected, 'nui-tab--disabled': disabled }"
    :aria-current="selected ? 'page' : undefined"
    v-bind="linkAttrs"
    @click="onClick"
  >
    <NuiIcon v-if="link.icon" :icon="link.icon" class="nui-tab__icon" />
    <span class="nui-tab__label">{{ link.label }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { destinationAttrs, useLinkTag } from '../shared/destination';
import { useTabList, useTabs } from './tabs-context';
import type { NuiTabLinkProps } from './tabs.types';

const PRIMARY_BUTTON = 0;

const { link, linkKey, as } = defineProps<NuiTabLinkProps>();

const tabs = useTabs();
const list = useTabList();
const tag = useLinkTag(() => ({ as, to: link.to }));

const disabled = computed(() => link.disabled === true);
const selected = computed(() => tabs.modelValue.value === linkKey);

const linkAttrs = computed(() =>
  disabled.value
    ? { 'aria-disabled': 'true', tabindex: -1 }
    : destinationAttrs(undefined, link.to, tag.value),
);

const onClick = (event: MouseEvent): void => {
  if (disabled.value) {
    event.preventDefault();

    return;
  }
  if (
    event.button === PRIMARY_BUTTON &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    tabs.select(linkKey);
  }
};
</script>
