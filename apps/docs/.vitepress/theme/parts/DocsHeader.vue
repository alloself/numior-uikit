<template>
  <NuiAppBar>
    <template #start>
      <NuiSidebarTrigger v-if="layout.mobile.value" />
      <NuiLink :href="localeBase" tone="neutral" underline="none" :aria-label="site.title">
        <DocsLogo />
      </NuiLink>
    </template>
    <DocsNav
      v-if="!layout.mobile.value"
      :items="navLinks"
      :label="texts.sections"
      :more-label="texts.more"
    />
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
      <NuiMenu :label="texts.accent" placement="bottom-end">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            size="sm"
            icon-only
            :aria-label="texts.accent"
          >
            <span class="size-3 bg-primary" />
          </NuiButton>
        </template>
        <NuiMenuRadioGroup v-model="palette.choice.value">
          <NuiMenuRadioItem :value="NUMIOR_PALETTE">Numior</NuiMenuRadioItem>
        </NuiMenuRadioGroup>
        <NuiMenuSeparator />
        <NuiMenuLabel>{{ texts.builtInAccents }}</NuiMenuLabel>
        <NuiMenuRadioGroup v-model="palette.choice.value">
          <NuiMenuRadioItem v-for="accent in ACCENTS" :key="accent" :value="accent">
            {{ texts.accents[accent] }}
          </NuiMenuRadioItem>
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
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiSidebarTrigger,
  useColorScheme,
  useLayout,
} from '@numior/vue';
import DocsLogo from './DocsLogo.vue';
import DocsNav from './DocsNav.vue';
import { NUMIOR_PALETTE, useAccent } from '../composables/use-accent';
import { useDocs } from '../composables/use-docs';
import type { ColorScheme, IconAlias } from '@numior/primitives';
import { DocsAccent, type DocsNavLink, type DocsThemeConfig } from '../theme.types';

const emit = defineEmits<{ search: [] }>();

const { theme, site } = useData<DocsThemeConfig>();
const { texts, localeBase, locales, startsCurrent } = useDocs();
const layout = useLayout();
const scheme = useColorScheme();
const palette = useAccent();

const ACCENTS = Object.values(DocsAccent);

const SCHEME_ICONS: Record<ColorScheme, IconAlias> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
};

const schemeIcon = computed(() => SCHEME_ICONS[scheme.scheme.value]);

const navLinks = computed<DocsNavLink[]>(() =>
  theme.value.nav.map((item) => ({
    text: item.text,
    link: withBase(item.link),
    current: item.sections.some(startsCurrent),
  })),
);
</script>
