<template>
  <section class="panel" aria-labelledby="navigation-title">
    <div class="section-heading">
      <h2 id="navigation-title">Навигация</h2>
      <span class="tag">NuiMenu · NuiTabs · NuiBreadcrumbs · NuiLink</span>
    </div>
    <div class="nui-flex nui-wrap nui-items-center nui-gap-2">
      <NuiMenu v-model:open="menuOpen" data-testid="nav-menu">
        <template #trigger="{ attrs }">
          <NuiButton v-bind="attrs" variant="outline" tone="neutral" data-testid="nav-menu-trigger"
            >Действия</NuiButton
          >
        </template>
        <NuiMenuItem icon="check" shortcut="⌘R" @select="act('rename')">Переименовать</NuiMenuItem>
        <NuiMenuItem shortcut="⌘D" @select="act('duplicate')">Дублировать</NuiMenuItem>
        <NuiMenuItem href="#docs" @select="act('docs')">Документация</NuiMenuItem>
        <NuiMenuItem disabled @select="act('locked')">Архивировать</NuiMenuItem>
        <NuiMenuSeparator />
        <NuiMenuLabel>Вид</NuiMenuLabel>
        <NuiMenuCheckboxItem v-model:checked="gridOn">Сетка</NuiMenuCheckboxItem>
        <NuiMenuRadioGroup v-model="sort">
          <NuiMenuRadioItem value="name">По имени</NuiMenuRadioItem>
          <NuiMenuRadioItem value="date">По дате</NuiMenuRadioItem>
        </NuiMenuRadioGroup>
        <NuiMenuSeparator />
        <NuiMenuSub label="Поделиться">
          <NuiMenuItem @select="act('email')">Почта</NuiMenuItem>
          <NuiMenuItem @select="act('link')">Ссылка</NuiMenuItem>
        </NuiMenuSub>
        <NuiMenuItem tone="error" @select="act('delete')">Удалить</NuiMenuItem>
      </NuiMenu>
    </div>
    <p class="description">
      Подробности в
      <NuiLink href="https://example.com" external data-testid="nav-link-external"
        >документации</NuiLink
      >
      и в разделе справки.
    </p>
    <NuiTabs v-model="tab" data-testid="nav-tabs">
      <NuiTabList label="Разделы">
        <NuiTab value="overview" icon="info">Обзор</NuiTab>
        <NuiTab value="team">Команда</NuiTab>
        <NuiTab value="billing" disabled>Оплата</NuiTab>
        <NuiTab value="settings">Настройки</NuiTab>
      </NuiTabList>
      <NuiTabPanel value="overview">Панель обзора</NuiTabPanel>
      <NuiTabPanel value="team">Панель команды</NuiTabPanel>
      <NuiTabPanel value="billing">Панель оплаты</NuiTabPanel>
      <NuiTabPanel value="settings" lazy>Панель настроек</NuiTabPanel>
    </NuiTabs>
    <NuiTabs
      v-model="manualTab"
      activation="manual"
      variant="soft"
      size="sm"
      :tabs="periods"
      label="Период"
      data-testid="nav-tabs-manual"
    >
      <template #panel="{ tab: period }">Период: {{ period.label }}</template>
    </NuiTabs>
    <NuiBreadcrumbs
      :items="path"
      :max-items="3"
      label="Путь"
      more-label="Показать путь"
      data-testid="nav-crumbs"
    />
    <NuiBreadcrumbs
      :items="path.slice(0, 3)"
      label="Короткий путь"
      data-testid="nav-crumbs-short"
    />
    <pre class="output" data-testid="navigation-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiBreadcrumbs,
  NuiButton,
  NuiLink,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
  NuiTab,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
  type NuiBreadcrumbItem,
  type NuiTabDescriptor,
} from '@numior/vue';

const periods: NuiTabDescriptor[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

const path: NuiBreadcrumbItem[] = [
  { label: 'Главная', href: '#home' },
  { label: 'Проекты', href: '#projects' },
  { label: 'Numior', href: '#numior' },
  { label: 'Настройки', href: '#settings' },
  { label: 'Оплата' },
];

const menuOpen = ref(false);
const gridOn = ref(false);
const sort = ref('name');
const lastAction = ref('');
const tab = ref('overview');
const manualTab = ref('day');

const act = (name: string): void => {
  lastAction.value = name;
};

const output = computed(() =>
  JSON.stringify(
    {
      menuOpen: menuOpen.value,
      gridOn: gridOn.value,
      sort: sort.value,
      lastAction: lastAction.value,
      tab: tab.value,
      manualTab: manualTab.value,
    },
    null,
    2,
  ),
);
</script>
