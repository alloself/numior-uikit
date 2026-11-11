<template>
  <NuiTabs
    v-model="selected"
    :tabs="tabs"
    :label="texts.codeVariants"
    size="sm"
    class="nui-not-prose mb-5"
  >
    <template #panel="{ tab }">
      <NuiCode v-bind="codeOf(tab.value)" />
    </template>
  </NuiTabs>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiCode, NuiTabs, type NuiCodeProps } from '@numior/vue';
import { useCodeChoice } from '../composables/use-code-choice';
import type { CodeTabsProps } from '../theme.types';

const EMPTY_CODE: NuiCodeProps = { code: '' };

const { items, texts } = defineProps<CodeTabsProps>();

const choice = useCodeChoice();

const tabs = computed(() => items.map((item) => ({ value: item.label, label: item.label })));

const selected = computed({
  get: () => choice.chosen(items.map((item) => item.label)),
  set: (label: string) => {
    choice.choose(label);
  },
});

const codeOf = (label: string): NuiCodeProps =>
  items.find((item) => item.label === label)?.code ?? EMPTY_CODE;
</script>
