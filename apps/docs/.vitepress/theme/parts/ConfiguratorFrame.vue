<template>
  <NuiTabs v-model="view" variant="line" size="sm" class="nui-not-prose my-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <NuiTabList :label="texts.exampleView">
        <NuiTab value="preview" icon="eye">{{ texts.preview }}</NuiTab>
        <NuiTab value="code" icon="code">{{ texts.code }}</NuiTab>
      </NuiTabList>
      <div class="flex items-center gap-1">
        <PreviewOptions v-model:options="previewOptions" :texts="texts" />
        <NuiButton variant="ghost" tone="neutral" size="sm" @click="reset">{{
          texts.reset
        }}</NuiButton>
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="sm"
          :aria-label="clipboard.copied.value ? texts.copied : texts.copyCode"
          :icon="clipboard.copied.value ? 'check' : 'copy'"
          @click="copy"
        />
      </div>
    </div>
    <NuiTabPanel value="preview" class="mt-2 flex flex-col gap-4">
      <PreviewFrame :texts="texts" :options="previewOptions">
        <component :is="component.name" v-bind="bound">
          <template v-if="hasContent" #default>{{ content }}</template>
        </component>
      </PreviewFrame>
      <form class="flex flex-col gap-4" :aria-label="texts.configuratorProps" @submit.prevent>
        <div
          v-if="fields.length > 0 || hasContent"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <ConfiguratorControl
            v-for="prop in fields"
            :key="prop.name"
            :prop="prop"
            :state="state"
            :locale="locale"
            @change="change"
          />
          <NuiInput
            v-if="hasContent"
            v-model="content"
            :label="texts.configuratorContent"
            :description="texts.configuratorContentHint"
            size="sm"
          />
        </div>
        <div v-if="flags.length > 0" class="flex flex-wrap gap-x-6 gap-y-2">
          <ConfiguratorControl
            v-for="prop in flags"
            :key="prop.name"
            :prop="prop"
            :state="state"
            :locale="locale"
            @change="change"
          />
        </div>
      </form>
    </NuiTabPanel>
    <NuiTabPanel value="code" class="mt-2">
      <NuiCode :code="code" :tokens="tokens" language="vue" :copyable="false" />
    </NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useClipboard } from '@numior/primitives';
import {
  NuiButton,
  NuiCode,
  NuiInput,
  NuiTab,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
} from '@numior/vue';
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
const fields = props.filter((prop) => prop.kind !== 'boolean');
const flags = props.filter((prop) => prop.kind === 'boolean');
const hasContent = component.configurator?.content !== undefined;
const initialContent = component.configurator?.content?.[locale] ?? '';
const seeds = component.configurator?.values ?? {};
const state = reactive(configuratorState(props, seeds, locale));
const content = ref(initialContent);
const previewOptions = ref<PreviewOption[]>([]);
const view = ref('preview');
const clipboard = useClipboard();

const change = (next: ConfiguratorChange): void => {
  applyChange(state, next);
};

const reset = (): void => {
  resetState(state, props, seeds, locale);
  content.value = initialContent;
};

const values = computed(() => stateValues(state));
const bound = computed(() => boundValues(values.value));
const code = computed(() => configuratorCode(component.name, props, values.value, content.value));
const tokens = useVueTokens(code);

const copy = (): void => {
  void clipboard.copy(code.value);
};
</script>
