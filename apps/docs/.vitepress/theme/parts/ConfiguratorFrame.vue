<template>
  <div class="nui-not-prose nui-my-6 nui-grid nui-grid-auto-lg nui-gap-4">
    <div class="nui-flex nui-flex-col nui-gap-2">
      <div
        role="group"
        :aria-label="texts.preview"
        class="nui-rounded-lg nui-border nui-bg-surface nui-text nui-p-6 nui-flex nui-wrap nui-items-center nui-justify-center nui-gap-3"
      >
        <component :is="component.name" v-bind="bound">{{ content }}</component>
      </div>
      <NuiCode :code="code" :tokens="tokens" language="vue" />
    </div>
    <form
      class="nui-flex nui-flex-col nui-gap-3"
      :aria-label="texts.configuratorProps"
      @submit.prevent
    >
      <NuiField v-for="prop in props" :key="prop.name" :label="prop.name">
        <NuiSelect
          v-if="prop.kind === 'enum'"
          :model-value="state.enums[prop.name] ?? null"
          :options="optionsOf(prop)"
          clearable
          @update:model-value="(value) => setEnum(prop.name, value)"
        />
        <NuiSwitch
          v-else-if="prop.kind === 'boolean'"
          :model-value="state.flags[prop.name] ?? false"
          @update:model-value="(value) => setFlag(prop.name, value)"
        />
        <NuiNumberField
          v-else-if="prop.kind === 'number'"
          :model-value="state.numbers[prop.name] ?? null"
          @update:model-value="(value) => setNumber(prop.name, value)"
        />
        <NuiInput
          v-else
          :model-value="state.strings[prop.name] ?? ''"
          @update:model-value="(value) => setString(prop.name, value)"
        />
      </NuiField>
      <NuiField v-if="component.configurator?.content" :label="texts.configuratorContent">
        <NuiInput v-model="content" />
      </NuiField>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { NuiCode, NuiField, NuiInput, NuiNumberField, NuiSelect, NuiSwitch } from '@numior/vue';
import type { ReferenceProp } from '../../reference/reference.types';
import {
  boundValues,
  configuratorCode,
  configuratorState,
  stateValues,
} from '../configurator-code';
import { useVueTokens } from '../highlight';
import type { ConfiguratorFrameProps } from '../theme.types';

const { component, locale, texts } = defineProps<ConfiguratorFrameProps>();

const configured = new Set(component.configurator?.props ?? []);
const props = component.props.filter((prop) => configured.has(prop.name));
const state = reactive(configuratorState(props));
const content = ref(component.configurator?.content?.[locale] ?? '');

const optionsOf = (prop: ReferenceProp): { value: string; label: string }[] =>
  (prop.values ?? []).map((value) => ({ value, label: value }));

const setEnum = (name: string, value: string | null): void => {
  state.enums[name] = value;
};

const setFlag = (name: string, value: boolean): void => {
  state.flags[name] = value;
};

const setNumber = (name: string, value: number | null): void => {
  state.numbers[name] = value;
};

const setString = (name: string, value: string): void => {
  state.strings[name] = value;
};

const values = computed(() => stateValues(state));
const bound = computed(() => boundValues(values.value));
const code = computed(() => configuratorCode(component.name, props, values.value, content.value));
const tokens = useVueTokens(code);
</script>
