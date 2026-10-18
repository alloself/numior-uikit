<template>
  <NuiAppBar>
    <template #start>
      <NuiSidebarTrigger v-if="layout.mobile.value" />
      <NuiLink
        :href="localeBase"
        tone="neutral"
        underline="none"
        class="font-semibold text-base whitespace-nowrap"
        >Numior UI</NuiLink
      >
    </template>
    <nav
      v-if="!layout.mobile.value"
      :aria-label="texts.sections"
      class="flex items-center gap-1 font-normal"
    >
      <NuiButton
        v-for="item in theme.nav"
        :key="item.link"
        :href="withBase(item.link)"
        variant="ghost"
        tone="neutral"
        size="sm"
        :aria-current="startsCurrent(item.section) ? 'page' : undefined"
        >{{ item.text }}</NuiButton
      >
    </nav>
    <template #end>
      <NuiButton
        variant="soft"
        tone="neutral"
        size="sm"
        class="font-normal text-muted-foreground"
        :aria-label="texts.search"
        icon="search"
        @click="emit('search')"
      >
        <span v-if="!layout.mobile.value">{{ texts.search }}</span>
        <NuiKbd v-if="!layout.mobile.value" keys="mod+k" size="sm" />
      </NuiButton>
      <NuiMenu :label="texts.theme" placement="bottom-end">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            size="sm"
            :aria-label="texts.theme"
            :icon="schemeIcon"
          />
        </template>
        <NuiMenuRadioGroup v-model="scheme.scheme.value">
          <NuiMenuRadioItem value="light">{{ texts.light }}</NuiMenuRadioItem>
          <NuiMenuRadioItem value="dark">{{ texts.dark }}</NuiMenuRadioItem>
          <NuiMenuRadioItem value="system">{{ texts.system }}</NuiMenuRadioItem>
        </NuiMenuRadioGroup>
      </NuiMenu>
      <NuiMenu :label="texts.language" placement="bottom-end">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            size="sm"
            :aria-label="texts.language"
            icon="languages"
          />
        </template>
        <NuiMenuItem v-for="locale in locales" :key="locale.key" :href="locale.link">
          {{ locale.label }}
          <template v-if="locale.current" #trailing>
            <NuiIcon icon="check" />
          </template>
        </NuiMenuItem>
      </NuiMenu>
    </template>
  </NuiAppBar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import {
  NuiAppBar,
  NuiButton,
  NuiIcon,
  NuiKbd,
  NuiLink,
  NuiMenu,
  NuiMenuItem,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiSidebarTrigger,
  useColorScheme,
  useLayout,
} from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import type { ColorScheme, IconAlias } from '@numior/primitives';
import type { DocsThemeConfig } from '../theme.types';

const emit = defineEmits<{ search: [] }>();

const { theme } = useData<DocsThemeConfig>();
const { texts, localeBase, locales, startsCurrent } = useDocs();
const layout = useLayout();
const scheme = useColorScheme();

const SCHEME_ICONS: Record<ColorScheme, IconAlias> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
};

const schemeIcon = computed(() => SCHEME_ICONS[scheme.scheme.value]);
</script>
