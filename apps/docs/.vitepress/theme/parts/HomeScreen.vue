<template>
  <section class="flex flex-col gap-6" :aria-label="texts.homeScreen">
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
      <div class="overflow-hidden rounded-lg border bg-surface">
        <iframe
          ref="frame"
          :src="src"
          :title="texts.homeScreen"
          class="block w-full border-0"
          :style="{ blockSize: `${blockSize}px` }"
          @load="sync"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import {
  NuiSelect,
  NuiToggleGroup,
  useColorScheme,
  type NuiOption,
  type NuiToggleItem,
  type ResolvedColorScheme,
} from '@numior/vue';
import { NUMIOR_PALETTE, useAccent } from '../composables/use-accent';
import { useFramedHeight } from '../block-height';
import { applyAttributes, screenAttributes } from '../frame-attributes';
import { DocsAccent, type HomeScreenProps } from '../theme.types';
import FrameCorners from './FrameCorners.vue';

const RTL = 'rtl';

const { src, height, texts } = defineProps<HomeScreenProps>();

const site = useColorScheme();
const palette = useAccent();
const frame = useTemplateRef<HTMLIFrameElement>('frame');

const pickedScheme = ref<ResolvedColorScheme>();
const pickedAccent = ref<string>();
const directions = ref<string[]>([]);

const blockSize = useFramedHeight(frame, () => height);

const scheme = computed<ResolvedColorScheme>({
  get: () => pickedScheme.value ?? site.resolved.value,
  set: (value) => {
    pickedScheme.value = value;
  },
});

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

const attributes = computed(() =>
  screenAttributes({
    scheme: scheme.value,
    accent: accent.value ?? NUMIOR_PALETTE,
    rtl: directions.value.includes(RTL),
  }),
);

const sync = (): void => {
  applyAttributes(frame.value?.contentDocument?.documentElement, attributes.value);
};

watch(attributes, sync, { flush: 'post' });
</script>
