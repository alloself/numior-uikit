<template>
  <div class="flex flex-col gap-6">
    <div role="group" :aria-label="texts.screenOptions" class="flex flex-wrap items-center gap-3">
      <div class="w-44">
        <NuiSelect v-model="accent" :options="accents" :aria-label="texts.accent" size="sm" />
      </div>
      <div class="ms-auto flex items-center gap-3">
        <NuiToggleGroup
          v-model="scheme"
          :items="schemes"
          :label="texts.theme"
          size="sm"
          required
          icon-only
        />
        <NuiToggleGroup
          v-model:values="directions"
          :items="directionItems"
          :label="texts.rtl"
          size="sm"
          multiple
          icon-only
        />
      </div>
    </div>
    <div class="relative">
      <FrameCorners />
      <div class="overflow-hidden rounded-lg">
        <div
          role="region"
          :aria-label="texts.homeScreen"
          :dir="direction"
          class="bg-surface p-4 font-sans text-foreground sm:p-6"
          :class="schemeClass"
          :style="look"
        >
          <component :is="screen" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiSelect,
  NuiToggleGroup,
  useColorScheme,
  type NuiOption,
  type NuiToggleItem,
  type ResolvedColorScheme,
} from '@numior/vue';
import { NUMIOR_PALETTE, useAccent } from '../composables/use-accent';
import { themeModel } from '../theme-sources';
import { DocsAccent, type HomeScreenProps } from '../theme.types';
import FrameCorners from './FrameCorners.vue';

const RTL = 'rtl';

const { screen, texts } = defineProps<HomeScreenProps>();

const site = useColorScheme();
const palette = useAccent();

const pickedScheme = ref<ResolvedColorScheme>();
const pickedAccent = ref<string>();
const directions = ref<string[]>([]);

const scheme = computed<ResolvedColorScheme>({
  get: () => pickedScheme.value ?? site.resolved.value,
  set: (value) => {
    pickedScheme.value = value;
  },
});

const schemeClass = computed(() =>
  pickedScheme.value === undefined ? undefined : `nui-theme--${pickedScheme.value}`,
);

const accent = computed<string | null>({
  get: () => pickedAccent.value ?? palette.choice.value,
  set: (value) => {
    pickedAccent.value = value ?? NUMIOR_PALETTE;
  },
});

const accents = computed<readonly NuiOption<string>[]>(() => [
  { value: NUMIOR_PALETTE, label: 'Numior' },
  ...Object.values(DocsAccent).map((value) => ({ value, label: texts.accents[value] })),
]);

const schemes = computed<readonly NuiToggleItem<ResolvedColorScheme>[]>(() => [
  { value: 'light', label: texts.light, icon: 'sun' },
  { value: 'dark', label: texts.dark, icon: 'moon' },
]);

const directionItems = computed<readonly NuiToggleItem<string>[]>(() => [
  { value: RTL, label: texts.rtl, icon: 'direction' },
]);

const direction = computed(() => (directions.value.includes(RTL) ? 'rtl' : 'ltr'));

const look = computed(() => {
  const { presets } = themeModel;
  const chosen = accent.value ?? NUMIOR_PALETTE;

  return themeModel.preview(
    chosen === NUMIOR_PALETTE ? presets.numior : { ...presets.base, palette: chosen },
  );
});
</script>
