<template>
  <section
    class="nui-not-prose my-6 grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
    :aria-label="texts.themeBuilder"
  >
    <div
      role="group"
      :aria-label="texts.themeOptions"
      class="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start"
    >
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">{{ texts.themePreset }}</span>
        <NuiToggleGroup
          v-model="preset"
          :items="presets"
          :label="texts.themePreset"
          variant="segmented"
          size="sm"
          required
        />
      </div>
      <NuiSelect v-model="palette" :options="palettes" :label="texts.themeColor" size="sm">
        <template #option="{ option }">
          <span class="flex items-center gap-2">
            <span
              class="size-3 shrink-0 rounded-full bg-primary"
              :class="paletteClassOf(option.value)"
            />
            {{ option.label }}
          </span>
        </template>
        <template #value>
          <span class="flex items-center gap-2">
            <span
              class="size-3 shrink-0 rounded-full bg-primary"
              :class="paletteClassOf(choice.palette)"
            />
            {{ paletteLabel }}
          </span>
        </template>
      </NuiSelect>
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">{{ texts.themeRadius }}</span>
        <NuiToggleGroup
          v-model="radius"
          :items="radii"
          :label="texts.themeRadius"
          variant="segmented"
          size="sm"
          required
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">{{ texts.themeFont }}</span>
        <NuiToggleGroup
          v-model="font"
          :items="fonts"
          :label="texts.themeFont"
          variant="segmented"
          size="sm"
          required
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">{{ texts.theme }}</span>
        <NuiToggleGroup
          v-model="scheme"
          :items="schemes"
          :label="texts.theme"
          variant="segmented"
          size="sm"
          required
        />
      </div>
      <NuiButton icon="code" @click="exporting = true">{{ texts.themeCode }}</NuiButton>
    </div>
    <div class="relative min-w-0">
      <FrameCorners />
      <div class="overflow-hidden rounded-lg border">
        <div
          role="region"
          :aria-label="texts.themePreview"
          class="bg-surface p-4 font-sans text-foreground sm:p-6"
          :class="schemeClass"
          :style="previewStyle"
        >
          <component :is="preview" />
        </div>
      </div>
    </div>
    <NuiDialog
      v-model:open="exporting"
      :title="texts.themeCode"
      :description="texts.themeCodeLead"
      size="lg"
    >
      <div class="flex flex-col gap-4">
        <NuiCode :code="css" language="css" copyable />
        <template v-if="fontPackage">
          <p class="m-0 text-sm">{{ texts.themeFontLead }}</p>
          <NuiCode :code="`pnpm add ${fontPackage}`" language="bash" copyable />
          <InlineText :text="texts.themeFontImport" class="text-sm" />
          <NuiCode :code="`import '${fontPackage}';`" language="ts" copyable />
        </template>
      </div>
    </NuiDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiButton,
  NuiCode,
  NuiDialog,
  NuiSelect,
  NuiToggleGroup,
  useColorScheme,
  type NuiOption,
  type NuiToggleItem,
  type ResolvedColorScheme,
} from '@numior/vue';
import { NUMIOR_PALETTE } from '../composables/use-accent';
import { paletteClassOf } from '../frame-theme';
import { FONT_PACKAGES } from '../theme-builder';
import { themeModel } from '../theme-sources';
import {
  DocsAccent,
  ThemeFont,
  ThemePreset,
  type ThemeBuilderProps,
  type ThemeChoice,
} from '../theme.types';
import FrameCorners from './FrameCorners.vue';
import InlineText from './InlineText.vue';

const REM_PX = 16;

const { preview, texts } = defineProps<ThemeBuilderProps>();

const site = useColorScheme();

const choice = ref<ThemeChoice>(themeModel.presets.numior);
const pickedScheme = ref<ResolvedColorScheme>();
const exporting = ref(false);

const preset = computed<ThemePreset | null>({
  get: () => choice.value.preset,
  set: (value) => {
    if (value === null) {
      return;
    }

    choice.value = themeModel.presets[value];
  },
});

const palette = computed<string | null>({
  get: () => choice.value.palette,
  set: (value) => {
    choice.value = { ...choice.value, palette: value ?? NUMIOR_PALETTE };
  },
});

const radius = computed<string | null>({
  get: () => choice.value.radius,
  set: (value) => {
    if (value === null) {
      return;
    }

    choice.value = { ...choice.value, radius: value };
  },
});

const font = computed<ThemeFont | null>({
  get: () => choice.value.font,
  set: (value) => {
    if (value === null) {
      return;
    }

    choice.value = { ...choice.value, font: value };
  },
});

const scheme = computed<ResolvedColorScheme>({
  get: () => pickedScheme.value ?? site.resolved.value,
  set: (value) => {
    pickedScheme.value = value;
  },
});

const schemeClass = computed(() =>
  pickedScheme.value === undefined ? undefined : `nui-theme--${pickedScheme.value}`,
);

const presets = computed<readonly NuiToggleItem<ThemePreset>[]>(() =>
  Object.values(ThemePreset).map((value) => ({ value, label: texts.themePresets[value] })),
);

const palettes = computed<readonly NuiOption<string>[]>(() => [
  { value: NUMIOR_PALETTE, label: 'Numior' },
  ...Object.values(DocsAccent).map((value) => ({ value, label: texts.accents[value] })),
]);

const paletteLabel = computed(
  () => palettes.value.find((option) => option.value === choice.value.palette)?.label ?? '',
);

const radii = computed<readonly NuiToggleItem<string>[]>(() =>
  themeModel.radii.map((value) => ({
    value,
    label: String(Number.parseFloat(value) * REM_PX),
  })),
);

const fonts = computed<readonly NuiToggleItem<ThemeFont>[]>(() =>
  Object.values(ThemeFont).map((value) => ({ value, label: texts.themeFonts[value] })),
);

const schemes = computed<readonly NuiToggleItem<ResolvedColorScheme>[]>(() => [
  { value: 'light', label: texts.light },
  { value: 'dark', label: texts.dark },
]);

const previewStyle = computed(() => themeModel.preview(choice.value));
const css = computed(() => themeModel.css(choice.value));
const fontPackage = computed(() => FONT_PACKAGES[choice.value.font]);
</script>
