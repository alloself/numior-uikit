<template>
  <div class="nui-not-prose nui-my-6 nui-flex nui-flex-col nui-gap-3">
    <div class="nui-flex nui-items-center nui-justify-end nui-gap-1">
      <PreviewOptions v-model:options="previewOptions" :texts="texts" />
      <NuiButton variant="ghost" tone="neutral" size="sm" @click="reset">{{
        texts.reset
      }}</NuiButton>
    </div>
    <PreviewFrame :texts="texts" :options="previewOptions">
      <component :is="component.name" v-bind="bound">{{ content }}</component>
    </PreviewFrame>
    <form
      class="nui-grid-auto nui-grid-auto-sm nui-gap-4 nui-items-start"
      :aria-label="texts.configuratorProps"
      @submit.prevent
    >
      <ConfiguratorControl
        v-for="prop in props"
        :key="prop.name"
        :prop="prop"
        :state="state"
        @change="change"
      />
      <NuiInput
        v-if="component.configurator?.content"
        v-model="content"
        :label="texts.configuratorContent"
        size="sm"
      />
    </form>
    <NuiCollapsible :label="texts.code" variant="plain">
      <NuiCode :code="code" :tokens="tokens" language="vue" />
    </NuiCollapsible>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { NuiButton, NuiCode, NuiCollapsible, NuiInput } from '@numior/vue';
import {
  applyChange,
  boundValues,
  configuratorCode,
  configuratorState,
  resetState,
  stateValues,
  type ConfiguratorChange,
} from '../configurator-code';
import { useVueTokens } from '../highlight';
import type { ConfiguratorFrameProps, PreviewOption } from '../theme.types';
import ConfiguratorControl from './ConfiguratorControl.vue';
import PreviewFrame from './PreviewFrame.vue';
import PreviewOptions from './PreviewOptions.vue';

const { component, locale, texts } = defineProps<ConfiguratorFrameProps>();

const configured = new Set(component.configurator?.props ?? []);
const props = component.props.filter((prop) => configured.has(prop.name));
const initialContent = component.configurator?.content?.[locale] ?? '';
const state = reactive(configuratorState(props));
const content = ref(initialContent);
const previewOptions = ref<PreviewOption[]>([]);

const change = (next: ConfiguratorChange): void => {
  applyChange(state, next);
};

const reset = (): void => {
  resetState(state, props);
  content.value = initialContent;
};

const values = computed(() => stateValues(state));
const bound = computed(() => boundValues(values.value));
const code = computed(() => configuratorCode(component.name, props, values.value, content.value));
const tokens = useVueTokens(code);
</script>
